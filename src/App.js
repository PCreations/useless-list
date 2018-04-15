import React, { Component } from "react";
import { Subject } from "rxjs/Rx";
import logo from "./logo.svg";
import "./App.css";
import uselessListAppFactory from "./core/uselessListAppFactory";

const messageAdded$ = new Subject();
const userEdited$ = new Subject();

const fetchMessages = () =>
  new Promise(resolve =>
    setTimeout(
      () =>
        resolve([
          { id: "m1", content: "msg 1", userId: "u1" },
          { id: "m2", content: "msg 2", userId: "u2" },
          { id: "m3", content: "msg 3", userId: "u3" }
        ]),
      500
    )
  );

const fetchUser = userId =>
  Promise.resolve(
    {
      u1: { id: "u1", username: "user 1" },
      u2: { id: "u2", username: "user 2" },
      u3: { id: "u3", username: "user 3" }
    }[userId]
  );

let currentMsgId = 3;

const addMessage = ({ content, userId }) => {
  const addedMessage = {
    id: `m${++currentMsgId}`,
    content,
    userId
  };
  messageAdded$.next(addedMessage);
  return addedMessage;
};

const uselessListAppApolloLinkState = uselessListAppFactory.APOLLO_LINK_STATE({
  fetchMessages,
  fetchUser,
  addMessage
});
messageAdded$.subscribe(
  uselessListAppApolloLinkState.dispatchMessageReceivedAction
);
userEdited$.subscribe(uselessListAppApolloLinkState.dispatchUserEditedAction);

const uselessListAppRx = uselessListAppFactory.RX({
  fetchMessages,
  fetchUser,
  addMessage
});
messageAdded$.subscribe(uselessListAppRx.dispatchMessageReceivedAction);
userEdited$.subscribe(uselessListAppRx.dispatchUserEditedAction);

const uselessListAppUnistore = uselessListAppFactory.UNISTORE({
  fetchMessages,
  fetchUser,
  addMessage
});
messageAdded$.subscribe(uselessListAppUnistore.dispatchMessageReceivedAction);
userEdited$.subscribe(uselessListAppUnistore.dispatchUserEditedAction);

class Inputs extends React.Component {
  handleSubmitMessage = () => {
    const { addMessage } = this.props;
    addMessage(this.messageInput.value);
  };
  handleSubmitUsername = () => {
    const { editUsername } = this.props;
    editUsername(this.usernameInput.value);
  };
  render() {
    const { username } = this.props;
    return (
      <div>
        <div style={{ display: "inline-block" }}>
          <input
            type="text"
            defaultValue={username}
            style={{ width: "32%", display: "inline-block" }}
            ref={input => (this.usernameInput = input)}
          />
          <input
            type="submit"
            value="modifier utilisateur"
            style={{ width: "48%", display: "inline-block" }}
            onClick={this.handleSubmitUsername}
          />
        </div>
        <div style={{ display: "inline-block" }}>
          <input
            type="text"
            placeholder="message"
            style={{ width: "53%", display: "inline-block" }}
            ref={input => (this.messageInput = input)}
          />
          <input
            type="submit"
            value="envoyer"
            style={{ width: "40%", display: "inline-block" }}
            onClick={this.handleSubmitMessage}
          />
        </div>
      </div>
    );
  }
}

const UselessListApp = ({ app, name, count }) => (
  <div style={{ width: "33%", display: "inline-block" }}>
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />
      <h1 className="App-title">{name}</h1>
    </header>
    <app.ContextProvider>
      <app.MessageListStateProvider>
        {({ loading, messages }) => {
          console.log({ loading, messages });
          return loading ? (
            <p>Chargement...</p>
          ) : (
            <div>
              <ul>
                {messages.map(msg => (
                  <li key={msg.id}>
                    <strong>{msg.user.username}</strong> : {msg.content}
                  </li>
                ))}
              </ul>
              <hr />
              <Inputs
                username={messages[count].user.username}
                editUsername={username => {
                  app.dispatchEditUsernameAction({
                    userId: messages[count].user.id,
                    username
                  });
                  userEdited$.next({
                    id: messages[count].user.id,
                    username
                  });
                }}
                addMessage={content =>
                  app.dispatchAddMessageAction({
                    userId: messages[count].user.id,
                    content
                  })
                }
              />
            </div>
          );
        }}
      </app.MessageListStateProvider>
    </app.ContextProvider>
  </div>
);

class App extends Component {
  render() {
    return (
      <div className="App">
        <UselessListApp
          app={uselessListAppUnistore}
          name="Unistore"
          count={0}
        />
        <UselessListApp app={uselessListAppRx} name="RX" count={1} />
        <UselessListApp
          app={uselessListAppApolloLinkState}
          name="Apollo Link State"
          count={2}
        />
      </div>
    );
  }
}

export default App;
