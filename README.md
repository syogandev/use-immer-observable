# use-immer-observable

React hook for immutable state updates with Immer and Proxy observable.

---

## Features

- Uses Immer for immutable state updates
- Tracks deep nested changes: all property updates are detected by a Proxy and then passed to Immer for immutable state updates
- Simple API to work with reactive immutable state
- Batch updates (`proxy.batch`) allow you to group multiple changes into a single render.

---

## 🛠️ How It Works

`useImmerObservable` combines **Immer** and **JavaScript Proxy** to provide intuitive, immutable state management with a mutable-like API.

- The state object is wrapped with a Proxy, so you can update properties directly (e.g., `proxy.set.xxx = ...`).
- All changes are intercepted by the Proxy and applied immutably using Immer under the hood.
- React's `useState` is used to trigger re-renders when the state changes.

### Architecture Diagram

```
[Your Component Code]
       |
       v
   [Proxy Wrapper] --(change detection)--> [Immer produce] --(new state)--> [React useState] --(re-render)
```

---

## Installation

```bash
npm install use-immer-observable
```

or

```bash
yarn add use-immer-observable
```

---

## Usage

```tsx
import useImmerObservable from "use-immer-observable";

const initialState = {
  user: { name: "Alice", age: 25 },
  items: [1, 2, 3],
};

const MyComponent = () => {
  const [state, proxy] = useImmerObservable(initialState);

  // Update nested property
  proxy.set.user.name = "Bob";

  // Replace the entire state object
  proxy.set = {
    user: { name: "Charlie", age: 30 },
    items: [4, 5, 6],
  };

  return <div>{state.user.name}</div>;
};
```

---

## 🆕 What's New

### Batch Update API

- **Batch mode can now be enabled via the second argument:**

  ```js
  const [state, proxy] = useImmerObservable(initialState, true);
  ```

  When batch mode is enabled from the beginning, state changes are not immediately applied.
  You must call `proxy.update()` after your changes to apply them.
  This is required for every update while batch mode is enabled.

- **Manual batch mode API (for advanced use):**
  If you want to control batch mode yourself, you can enable and disable it as needed:

  ```js
  proxy.enableBatch(true);
  proxy.set.user.name = "Carol";
  proxy.set.user.age = 42;
  proxy.update(); // Apply all changes at once
  proxy.enableBatch(false);
  ```

  In most cases, you do not need to call `enableBatch` if you started with batch mode enabled.

- **Scoped batch API:**
  ```js
  proxy.batch(() => {
    proxy.set.user.name = "Dave";
    proxy.set.user.age = 50;
  }); // All changes applied in a single render
  ```
  > Note: When using `proxy.batch`, batch mode is automatically enabled only during the callback.
  > After the callback finishes (even if an error occurs), batch mode is always restored to its previous state.
  > **If an exception is thrown inside the batch callback, all changes made within that batch will be rolled back and not applied to the state.**
  > This means that even if you update multiple properties inside a batch, if an error occurs, none of those changes will be reflected in the state (atomicity is guaranteed).

---

## 🔄 Comparison with use-immer

Both use-immer and use-immer-observable enable immutable updates using Immer, but they differ slightly in how you write updates.

> **Note:** use-immer-observable allows you to write more intuitive, mutable-style code, but uses JavaScript Proxy internally, which introduces some runtime overhead compared to use-immer.

### use-immer

You update state using a function passed to update():

```
onClick={() => {
  update(draft => {
    draft.user.isLoggedIn = true;
  });
}}
```

### use-immer-observable

You can directly mutate the proxy like regular JavaScript objects:

```
onClick={() => {
  proxy.set.user.isLoggedIn = true;
}}
```

---

## 🌐 Global State with React Context

You can manage your state and proxy globally using React Context:

```tsx
import React, { createContext, useContext } from "react";
import useImmerObservable from "use-immer-observable";

// 1. Create context
const GlobalStateContext = createContext(null);

// 2. Provider component
export const GlobalStateProvider = ({ children }) => {
  const [state, proxy] = useImmerObservable({
    user: { name: "Alice", isLoggedIn: false },
  });
  return (
    <GlobalStateContext.Provider value={{ state, proxy }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

// 3. Custom hook for easy access
export const useGlobalState = () => useContext(GlobalStateContext);

// 4. Usage in components
function LoginButton() {
  const { proxy } = useGlobalState();
  return (
    <button
      onClick={() => {
        proxy.set.user.isLoggedIn = true;
      }}
    >
      Log In
    </button>
  );
}

function UserInfo() {
  const { state } = useGlobalState();
  return (
    <div>
      User: {state.user.name} ({state.user.isLoggedIn ? "Logged In" : "Guest"})
    </div>
  );
}
```

This pattern allows you to share and mutate state from anywhere in your component tree, just like with other global state solutions.

---

## ⚠️ Important Caveats

### Mutating arrays directly won't work

```ts
proxy.set.items.push(4); // ❌ No re-render will occur
```

This does **not** trigger state updates because `.push()` mutates the array in-place and doesn't trigger the Proxy's `set` trap.

✅ To update arrays correctly, assign a new array:

```ts
proxy.set.items = [...proxy.set.items, 4]; // ✅ triggers re-render
```

---

### structuredClone Limitation

This library uses [`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone) to deeply clone the initial state and reset state when needed.

Only objects supported by `structuredClone` are safe to use. Avoid:

- Functions
- Class instances
- DOM nodes
- Circular references

---

## Peer Dependencies

- React 18 or 19 is required
- A modern browser with `structuredClone` support

---

## License

MIT License © 2025 syogandev

---

## Repository

https://github.com/syogandev/use-immer-observable
