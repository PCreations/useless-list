import React from "react";
import { BehaviorSubject, Subject, Obsevable } from "rxjs/Rx";
import compose from "recompose/compose";
import withState from "recompose/withState";
import lifecycle from "recompose/lifecycle";
import { Map, fromJS, is } from "immutable";

const extension = window.devToolsExtension || window.top.devToolsExtension;
let devtools;
if (extension) {
  devtools = extension.connect();
}

const createRxAdapter = ({
  initialState = {
    messages: {},
    areMessagesLoading: false,
    users: {}
  },
  fetchMessages,
  fetchUser,
  addMessage: _addMessage
}) => {
  let ignoreState = false;

  const _initialState = fromJS(initialState);

  const updates$ = new Subject();

  const dispatch = (updateFn, actionName) => {
    updateFn.__actionName__ = actionName;
    updates$.next(updateFn);
  };

  const state$ = updates$
    .mergeScan(
      async (state, updateFn) => {
        const newState = await updateFn(state, dispatch);
        if (devtools) {
          if (!ignoreState) {
            const actionName =
              updateFn.__actionName__ || updateFn.name || "setState";
            devtools.send(actionName, newState.toJS());
          } else {
            ignoreState = false;
          }
        }
        return newState;
      },
      _initialState,
      1
    )
    .distinctUntilChanged()
    .catch(err => {
      console.error(err);
      return Obsevable.of(err);
    });

  if (devtools) {
    devtools.subscribe(message => {
      if (message.type === "DISPATCH" && message.state) {
        ignoreState =
          message.payload.type === "JUMP_TO_ACTION" ||
          message.payload.type === "JUMP_TO_STATE";
        console.log("SETTING IGNORE STATE TO", ignoreState);
        dispatch(state => fromJS(JSON.parse(message.state)));
      }
    });
    devtools.init(_initialState);
  }

  const getMessages = async (state, dispatch) => {
    if (state.get("messages").size > 0 || state.get("areMessagesLoading")) {
      return state;
    }
    dispatch(
      state => state.set("areMessagesLoading", true),
      "setMessagesLoading"
    );
    const messages = await fetchMessages();
    const users = await Promise.all(messages.map(msg => fetchUser(msg.userId)));
    const usersMap = users.reduce(
      (usersMap, user) => ({
        ...usersMap,
        [user.id]: Map(user)
      }),
      {}
    );
    const newState = state.mergeDeep(
      Map({
        areMessagesLoading: false,
        users: Map(usersMap),
        messages: Map(messages.map(msg => [msg.id, Map(msg)]))
      })
    );
    return newState;
  };

  const editUsername = ({ userId, username }) => state =>
    state.setIn(["users", userId, "username"], username);

  const messageReceived = ({ id, content, userId }) => async state => {
    let newState = state.setIn(["messages", id], Map({ id, content, userId }));
    if (!state.getIn(["users", userId])) {
      const user = await fetchUser(userId);
      newState = newState.setIn(["users", user.id], user);
    }
    return newState;
  };

  const addMessage = ({ userId, content }) => async state => {
    const message = await _addMessage({ userId, content });
    return state.setIn(["messages", message.id], Map(message));
  };

  const messagesSelector$ = state$
    .map(state => ({
      loading: state.get("areMessagesLoading"),
      messages: state
        .get("messages")
        .toList()
        .map(msg => Map({
          id: msg.get('id'),
          content: msg.get('content'),
          user: state.getIn(['users', msg.get('userId')])
        }))
        .toJS()
    }))
    .distinctUntilChanged(is)
    .catch(err => {
      console.error(err);
      return Obsevable.of(err);
    });

  const dispatchGetMessagesAction = () => dispatch(getMessages);

  const dispatchEditUsernameAction = ({ userId, username }) =>
    dispatch(editUsername({ userId, username }), "editUsername");

  const dispatchAddMessageAction = ({ content, userId }) =>
    dispatch(addMessage({ content, userId }), "addMessage");

  const dispatchMessageReceivedAction = ({ id, content, userId }) =>
    dispatch(messageReceived({ id, content, userId }), "messageReceived");

  const dispatchUserEditedAction = ({ id, username }) =>
    dispatch(editUsername({ userId: id, username }), "userEdited");

  const MessageListStateProvider = lifecycle({
    componentDidCatch(error, info) {
      console.error(error, info);
    }
  })(
    class MessageListStateProvider extends React.Component {
      state = {
        messages: [],
        loading: false
      };
      componentDidMount() {
        this._unsubscribe = messagesSelector$.subscribe(
          this.setState.bind(this)
        );
        dispatchGetMessagesAction();
      }
      componentWillUnmount() {
        this._unsubscribe();
      }
      render() {
        return !(
          Object.values(this.state.messages).length === 0 && !this.state.loading
        )
          ? this.props.children(this.state)
          : null;
      }
    }
  );

  const ContextProvider = ({ children }) => React.Children.only(children);

  return Object.freeze({
    dispatchEditUsernameAction,
    dispatchMessageReceivedAction,
    dispatchAddMessageAction,
    dispatchUserEditedAction,
    MessageListStateProvider,
    ContextProvider
  });
};

export default createRxAdapter;
