import React from "react";
import PropTypes from "prop-types";
import { Subject } from "rxjs/Rx";
import { mount } from "enzyme";
import { inspect } from "util";

import uselessListAppFactory from "../uselessListAppFactory";

const createTestApp = (initialState, messageAdded$ = new Subject()) => {
  const fetchMessages = jest.fn(() => {
    return Promise.resolve([
      { id: "m1", content: "msg 1", userId: "u1" },
      { id: "m2", content: "msg 2", userId: "u2" },
      { id: "m3", content: "msg 3", userId: "u1" }
    ]);
  });

  const fetchUser = jest.fn(userId =>
    Promise.resolve(
      {
        u1: { id: "u1", username: "user 1" },
        u2: { id: "u2", username: "user 2" },
        u3: { id: "u3", username: "user 3" }
      }[userId]
    )
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

  return {
    ...uselessListAppFactory.RX({
      initialState,
      addMessage,
      fetchMessages,
      fetchUser
    }),
    fetchMessages,
    fetchUser
  };
};

const createRenderExpectations = ({ expectations, expect, done }) => {
  const count = expectations.length;
  const renderSubject$ = new Subject();
  const renderProp = props => {
    renderSubject$.next(props);
    return null;
  };
  const observableRender$ = renderSubject$
    .bufferCount(count)
    .take(1)
    .do(updates =>
      updates.map((update, index) => {
        expect(update).toEqual(expectations[index]);
      })
    )
    .subscribe({
      complete: done,
      error: done.fail
    });

  return {
    renderProp
  };
};

describe("given a MessageListStateProvider", () => {
  describe("when mounted", () => {
    test("then the renderProp should be called a first time with no message and a loading state at true, and a second time with the messages and a loading state at false", done => {
      const { ContextProvider, MessageListStateProvider } = createTestApp();
      const { renderProp } = createRenderExpectations({
        expectations: [
          {
            loading: true,
            messages: []
          },
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "user 1" }
              }
            ]
          }
        ],
        expect,
        done
      });
      mount(
        <ContextProvider>
          <MessageListStateProvider>{renderProp}</MessageListStateProvider>
        </ContextProvider>
      );
    });
  });
  describe("when an initialState is provided", () => {
    test("then the renderProp should be called with the correct messages and users from the initialState", done => {
      const { ContextProvider, MessageListStateProvider } = createTestApp({
        messages: {
          m1: { id: "m1", content: "msg 1", userId: "u1" },
          m2: { id: "m2", content: "msg 2", userId: "u2" }
        },
        users: {
          u1: { id: "u1", username: "user 1" },
          u2: { id: "u2", username: "user 2" }
        },
        areMessagesLoading: false
      });
      const { renderProp } = createRenderExpectations({
        expectations: [
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              }
            ]
          }
        ],
        expect,
        done
      });
      mount(
        <ContextProvider>
          <MessageListStateProvider>{renderProp}</MessageListStateProvider>
        </ContextProvider>
      );
    });
  });
  describe("when a editUsername action is dispatched", () => {
    test("then the renderProp should be called with the messages with updated username", done => {
      const {
        ContextProvider,
        MessageListStateProvider,
        dispatchEditUsernameAction,
        store
      } = createTestApp({
        messages: {
          m1: { id: "m1", content: "msg 1", userId: "u1" },
          m2: { id: "m2", content: "msg 2", userId: "u2" },
          m3: { id: "m3", content: "msg 3", userId: "u1" }
        },
        users: {
          u1: { id: "u1", username: "user 1" },
          u2: { id: "u2", username: "user 2" }
        },
        areMessagesLoading: false
      });
      const { renderProp } = createRenderExpectations({
        expectations: [
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "user 1" }
              }
            ]
          },
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "foo" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "foo" }
              }
            ]
          }
        ],
        expect,
        done
      });
      mount(
        <ContextProvider>
          <MessageListStateProvider>{renderProp}</MessageListStateProvider>
        </ContextProvider>
      );
      dispatchEditUsernameAction({ userId: "u1", username: "foo" });
    });
  });
  describe("when a username action is dispatched", () => {
    test("then the renderProp should be called with the messages with updated username", done => {
      const {
        ContextProvider,
        MessageListStateProvider,
        dispatchEditUsernameAction,
        store
      } = createTestApp({
        messages: {
          m1: { id: "m1", content: "msg 1", userId: "u1" },
          m2: { id: "m2", content: "msg 2", userId: "u2" },
          m3: { id: "m3", content: "msg 3", userId: "u1" }
        },
        users: {
          u1: { id: "u1", username: "user 1" },
          u2: { id: "u2", username: "user 2" }
        },
        areMessagesLoading: false
      });
      const { renderProp } = createRenderExpectations({
        expectations: [
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "user 1" }
              }
            ]
          },
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "foo" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "foo" }
              }
            ]
          }
        ],
        expect,
        done
      });
      mount(
        <ContextProvider>
          <MessageListStateProvider>{renderProp}</MessageListStateProvider>
        </ContextProvider>
      );
      dispatchEditUsernameAction({ userId: "u1", username: "foo" });
    });
  });
  describe("when a userEdited action is dispatched from an already known user", () => {
    test("then the renderProp should be called with the messages list with correct edited user's username", done => {
      const {
        ContextProvider,
        MessageListStateProvider,
        dispatchMessageReceivedAction,
        dispatchUserEditedAction,
      } = createTestApp({
        messages: {
          m1: { id: "m1", content: "msg 1", userId: "u1" },
          m2: { id: "m2", content: "msg 2", userId: "u2" },
          m3: { id: "m3", content: "msg 3", userId: "u1" }
        },
        users: {
          u1: { id: "u1", username: "user 1" },
          u2: { id: "u2", username: "user 2" }
        },
        areMessagesLoading: false
      });
      const { renderProp } = createRenderExpectations({
        expectations: [
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "user 1" }
              }
            ]
          },
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "foobar" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "foobar" }
              },
            ]
          }
        ],
        expect,
        done,
      });
      mount(
        <ContextProvider>
          <MessageListStateProvider>{renderProp}</MessageListStateProvider>
        </ContextProvider>
      );
      dispatchUserEditedAction({
        id: "u1",
        username: "foobar"
      });
    });
  });
  describe("when a messageReceived action is dispatched for an unknown user", () => {
    test("then the renderProp should be called with the messages list containing the appended message with the new user info", done => {
      const {
        ContextProvider,
        MessageListStateProvider,
        dispatchMessageReceivedAction,
        store
      } = createTestApp({
        messages: {
          m1: { id: "m1", content: "msg 1", userId: "u1" },
          m2: { id: "m2", content: "msg 2", userId: "u2" },
          m3: { id: "m3", content: "msg 3", userId: "u1" }
        },
        users: {
          u1: { id: "u1", username: "user 1" },
          u2: { id: "u2", username: "user 2" }
        },
        areMessagesLoading: false
      });
      const { renderProp } = createRenderExpectations({
        expectations: [
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "user 1" }
              }
            ]
          },
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m4",
                content: "msg 4",
                user: { id: "u3", username: "user 3" }
              }
            ]
          }
        ],
        expect,
        done
      });
      mount(
        <ContextProvider>
          <MessageListStateProvider>{renderProp}</MessageListStateProvider>
        </ContextProvider>
      );
      dispatchMessageReceivedAction({
        id: "m4",
        content: "msg 4",
        userId: "u3"
      });
    });
  });
  describe("when an addMessage action is dispatched", () => {
    test("then the renderProp should be called with the appended message", done => {
      const {
        ContextProvider,
        MessageListStateProvider,
        dispatchAddMessageAction
      } = createTestApp({
        messages: {
          m1: { id: "m1", content: "msg 1", userId: "u1" },
          m2: { id: "m2", content: "msg 2", userId: "u2" },
          m3: { id: "m3", content: "msg 3", userId: "u1" }
        },
        users: {
          u1: { id: "u1", username: "user 1" },
          u2: { id: "u2", username: "user 2" }
        },
        areMessagesLoading: false
      });
      const { renderProp } = createRenderExpectations({
        expectations: [
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "user 1" }
              }
            ]
          },
          {
            loading: false,
            messages: [
              {
                id: "m1",
                content: "msg 1",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m2",
                content: "msg 2",
                user: { id: "u2", username: "user 2" }
              },
              {
                id: "m3",
                content: "msg 3",
                user: { id: "u1", username: "user 1" }
              },
              {
                id: "m4",
                content: "msg 4",
                user: { id: "u1", username: "user 1" }
              }
            ]
          }
        ],
        expect,
        done
      });
      mount(
        <ContextProvider>
          <MessageListStateProvider>{renderProp}</MessageListStateProvider>
        </ContextProvider>
      );
      dispatchAddMessageAction({
        content: "msg 4",
        userId: "u1"
      });
    });
  });
});
