# use-immer-observable

React hook for immutable state updates with Immer and Proxy observable.

---

## Features

- Uses Immer for immutable state updates
- Tracks deep nested changes via Proxy observable
- Simple API to work with reactive immutable state

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

## 🔄 Comparison with use-immer

Both use-immer and use-immer-observable enable immutable updates using Immer, but the API style is different:

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

This style can feel more intuitive and requires less boilerplate, especially for simple updates.

## ⚠️ Important Caveats

### Full State Replacement

You can replace the entire state object using:

```ts
proxy.set = newState;
```

This is equivalent to calling `setState(newState)` and will re-render the component.

---

### Mutating arrays directly won't work

```ts
proxy.set.items.push(4); // ❌ No re-render will occur
```

This does **not** trigger state updates because `.push()` mutates the array in-place and doesn't trigger the Proxy's `set` trap.

✅ To update arrays correctly, assign a new array or use indexed assignment:

```ts
proxy.set.items = [...proxy.set.items, 4]; // ✅ triggers re-render

proxy.set.items[2] = 100; // ✅ triggers re-render
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
