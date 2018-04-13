import React from "react";
import { ApolloClient } from "apollo-client";
import { withClientState } from "apollo-link-state";
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloProvider, Query } from "react-apollo";
import lifecycle from "recompose/lifecycle";
import gql from "graphql-tag";

const createApolloLinkStateAdapter = ({
  initialState = {
    messages: {},
    areMessagesLoading: false,
    users: {}
  },
  fetchMessages,
  fetchUser: _fetchUser,
  addMessage
}) => {
  const cache = new InMemoryCache();

  const fetchUser = userId => {
    const user = cache.readFragment({
      fragment: gql`
        fragment user on User {
          id
          username
        }
      `,
      id: `User:${userId}`
    });
    if (user) {
      return user;
    }
    return _fetchUser(userId);
  };

  const defaultMessages = Object.values(initialState.messages).map(msg => ({
    id: msg.id,
    content: msg.content,
    user: {
      ...initialState.users[msg.userId],
      __typename: "User"
    },
    __typename: "Message"
  }));

  const defaults =
    defaultMessages.length > 0 ? { messages: defaultMessages } : null;

  const stateLink = withClientState({
    cache,
    defaults,
    resolvers: {
      Message: {
        user: async ({ userId }) => ({
          ...(await fetchUser(userId)),
          __typename: "User"
        })
      },
      Query: {
        messages: async (_, args, { cache }) => {
          return (await fetchMessages()).map(msg => {
            const { userId, ...rest } = msg;
            return {
              ...rest,
              userId,
              __typename: "Message"
            };
          });
        }
      },
      Mutation: {
        addMessage: async (_, { content, userId }, { cache }) => {
          const message = await addMessage({ content, userId });
          return { ...message, __typename: "Message" };
        },
        messageReceived: (_, { id, content, userId }, { cache }) => {
          return { id, content, userId, __typename: "Message" };
        },
        editUsername: (_, { userId, username }, { cache }) => {
          const id = `User:${userId}`;
          const fragment = gql`
            fragment user on User {
              id
              username
            }
          `;
          const user = cache.readFragment({ fragment, id });
          const data = {
            ...user,
            username,
            __typename: "User"
          };
          cache.writeFragment({
            fragment,
            id,
            data
          });
          return data;
        }
      }
    }
  });

  const client = new ApolloClient({
    cache,
    link: stateLink
  });

  const ContextProvider = ({ children }) => (
    <ApolloProvider client={client}>
      {React.Children.only(children)}
    </ApolloProvider>
  );

  const MessageListStateProvider = lifecycle({
    componentDidCatch(error, info) {
      console.error(error, info);
    }
  })(({ children }) => (
    <Query
      query={gql`
        query GetMessages {
          messages @client {
            id
            content
            user {
              id
              username
            }
          }
        }
      `}
      ssr={false}
    >
      {({ data = {}, loading, error }) =>
        children({
          loading,
          messages: (data.messages || []).map(msg => ({
            id: msg.id,
            content: msg.content,
            user: {
              id: msg.user.id,
              username: msg.user.username
            }
          }))
        })
      }
    </Query>
  ));

  const app = {
    dispatchEditUsernameAction: ({ userId, username }) => {
      client.mutate({
        mutation: gql`
          mutation editUsername($userId: String, $username: String) {
            editUsername(userId: $userId, username: $username) @client {
              id
              username
            }
          }
        `,
        variables: { userId, username }
      });
    },
    dispatchUserEditedAction: ({ id, username }) => app.dispatchEditUsernameAction({ userId: id, username }),
    dispatchMessageReceivedAction: async ({ id, content, userId }) => {
      const { data: { messageReceived } } = await client.mutate({
        mutation: gql`
          mutation messageReceived(
            $id: String
            $content: String
            $userId: String
          ) {
            messageReceived(id: $id, content: $content, userId: $userId)
              @client {
              id
              content
              user {
                id
                username
              }
            }
          }
        `,
        variables: { id, content, userId }
      });
      const query = gql`
        query {
          messages @client {
            id
            content
            user {
              id
              username
            }
          }
        }
      `;
      const previous = cache.readQuery({ query });
      const data = {
        messages: previous.messages.filter(msg => msg.id !== messageReceived.id).concat([messageReceived])
      };
      client.writeQuery({ query, data });
    },
    dispatchAddMessageAction: async ({ content, userId }) => {
      const { data: { addMessage: messageAdded } } = await client.mutate({
        mutation: gql`
          mutation addMessage($content: String, $userId: String) {
            addMessage(content: $content, userId: $userId) @client {
              id
              content
              user {
                id
                username
              }
            }
          }
        `,
        variables: { content, userId }
      });
      const query = gql`
        query {
          messages @client {
            id
            content
            user {
              id
              username
            }
          }
        }
      `;
      const previous = cache.readQuery({ query });
      const data = {
        messages: previous.messages.filter(msg => msg.id !== messageAdded.id).concat([messageAdded])
      };
      client.writeQuery({ query, data });
    },
    MessageListStateProvider,
    ContextProvider
  };

  return Object.freeze(app);
};

export default createApolloLinkStateAdapter;
