import React from "react";
import createUnistore from "unistore";
import devtools from "unistore/devtools";
import { Provider, connect } from "unistore/react";

const createUnistoreAdapter = ({
  initialState = {
    messages: {},
    areMessagesLoading: false,
    users: {}
  },
  fetchMessages,
  fetchUser,
  addMessage: _addMessage
}) => {
  const store = devtools(createUnistore(initialState));

  const getMessages = async state => {
    if (Object.values(state.messages).length > 0 || state.areMessagesLoading) {
      return;
    }
    store.setState({
      areMessagesLoading: true
    }, false, { name: 'messagesLoading' });
    const messages = await fetchMessages();
    const users = await Promise.all(messages.map(msg => fetchUser(msg.userId)));
    const usersMap = users.reduce(
      (usersMap, user) => ({
        ...usersMap,
        [user.id]: user
      }),
      {}
    );
    return {
      areMessagesLoading: false,
      users: {
        ...store.getState().users,
        ...usersMap
      },
      messages: {
        ...store.getState().messages,
        ...messages
      }
    };
  };

  const editUsername = (state, { userId, username }) => ({
    users: {
      ...state.users,
      [userId]: {
        ...state.users[userId],
        username
      }
    }
  });

  const userEdited = (state, { id, username }) => editUsername(state, { userId: id, username });

  const messageReceived = async (state, { id, content, userId }) => {
    const newState = {
      ...state,
      messages: {
        ...state.messages,
        [id]: {
          id,
          content,
          userId
        }
      }
    };
    if (!state.users[userId]) {
      const user = await fetchUser(userId);
      newState.users[user.id] = user;
    }
    return newState;
  };

  const addMessage = async (state, { userId, content }) => {
    const message = await _addMessage({ userId, content });
    return {
      messages: {
        ...state.messages,
        [message.id]: message
      }
    };
  };

  const messagesSelector = state => {
    return {
      loading: state.areMessagesLoading,
      messages: Object.values(state.messages).map(msg => ({
        id: msg.id,
        content: msg.content,
        user: state.users[msg.userId]
      }))
    };
  };

  const dispatchGetMessagesAction = store.action(getMessages);

  const dispatchEditUsernameAction = store.action(editUsername);

  const dispatchUserEditedAction = store.action(userEdited);

  const dispatchMessageReceivedAction = store.action(messageReceived);

  const dispatchAddMessageAction = store.action(addMessage);

  const MessageListStateProvider = connect(
    "messages, areMessagesLoading, users"
  )(
    class GetMessagesOnMount extends React.Component {
      componentDidMount() {
        dispatchGetMessagesAction();
      }
      render() {
        const { children, ...state } = this.props;
        return !(
          Object.values(state.messages).length === 0 &&
          !state.areMessagesLoading
        )
          ? children(messagesSelector(state))
          : null;
      }
    }
  );

  const ContextProvider = ({ children }) => (
    <Provider store={store}>{React.Children.only(children)}</Provider>
  );

  return Object.freeze({
    dispatchEditUsernameAction,
    dispatchUserEditedAction,
    dispatchMessageReceivedAction,
    dispatchAddMessageAction,
    MessageListStateProvider,
    ContextProvider,
    store
  });
};

export default createUnistoreAdapter;
