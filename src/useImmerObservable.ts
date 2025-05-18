import { useEffect, useRef, useState } from "react";
import { produce } from "immer";

// Type for callback used when the observable object is mutated
type ObservableCallback = (path: string[], value: any) => void;

/**
 * Recursively wraps an object in a Proxy to observe mutations.
 * Calls the provided callback whenever a property is set.
 */
// export const createObservableObject = (
//   obj: any,
//   callback: ObservableCallback,
//   path: string[] = []
// ): any => {
//   if (proxyCache.has(obj)) {
//     return proxyCache.get(obj);
//   }

//   const proxy: any = new Proxy(obj, {
//     get(target, key) {
//       const value = target[key];
//       if (typeof value === "object" && value !== null) {
//         // Recursively wrap nested objects
//         return createObservableObject(value, callback, [
//           ...path,
//           key.toString(),
//         ]);
//       }
//       return value;
//     },
//     set(target, key, value) {
//       console.log(`target, key, value ${target} ${String(key)} ${value}`);
//       target[key] = value; // Directly mutate (allowed inside proxy)
//       callback([...path, key.toString()], value); // Trigger state update

//       return true;
//     },
//   });
//   proxyCache.set(obj, proxy);
//   return proxy;
// };

/**
 * useImmerObservable
 *
 * A custom React hook that allows mutable-style updates to state,
 * while preserving immutability under the hood using Immer.
 *
 * @template T - Type of the initial state object
 * @param {T} obj - The initial state object
 * @returns {[T, { set: T }]} A tuple with the current state and a proxy for mutation
 *
 * @example
 * const initial = { user: { name: "Alice" } };
 * const [state, proxy] = useImmerObservable(initial);
 *
 * proxy.set.user.name = "Bob"; // Updates the state immutably
 *
 * // To replace the entire object:
 * proxy.set = { user: { name: "Charlie" } };
 *
 * @note
 * This hook uses structuredClone internally, so the initial object and values
 * assigned via `proxy.set = ...` must be structured-cloneable.
 *
 * @note
 * Mutating nested structures like `proxy.set.items.push(1)` won’t trigger updates.
 * You need to reassign: `proxy.set.items = [...proxy.set.items, 1]`
 */
const useImmerObservable = <T>(obj: T): [T, { set: T }] => {
  // State is managed immutably using Immer
  const [state, setstate] = useState(structuredClone(obj));
  const [resetValue, setResetValue] = useState<T | undefined>();
  const proxyCache = new WeakMap<object, any>(); // ← 閉じたキャッシュ

  const createObservableObject = (
    obj: any,
    callback: ObservableCallback,
    path: string[] = []
  ): any => {
    if (proxyCache.has(obj)) {
      return proxyCache.get(obj);
    }

    const proxy: any = new Proxy(obj, {
      get(target, key) {
        const value = target[key];
        if (typeof value === "object" && value !== null) {
          // Recursively wrap nested objects
          return createObservableObject(value, callback, [
            ...path,
            key.toString(),
          ]);
        }
        return value;
      },
      set(target, key, value) {
        console.log(`target, key, value ${target} ${String(key)} ${value}`);
        target[key] = value; // Directly mutate (allowed inside proxy)
        callback([...path, key.toString()], value); // Trigger state update

        return true;
      },
    });
    proxyCache.set(obj, proxy);
    return proxy;
  };

  // Proxy object with mutation callback
  const objRef = useRef<{ set: T }>(
    createObservableObject({ set: obj }, (path, _value) => {
      const value = structuredClone(_value);
      const realPath = path[0] === "set" ? path.slice(1) : path;

      if (realPath.length === 0) {
        // Replacing root object → avoid using produce
        setResetValue(value);
        return;
      }

      setstate((prev) =>
        produce(prev, (draft) => {
          let target = draft as any;
          // Traverse to the target key in the object
          for (let i = 0; i < realPath.length - 1; i++) {
            target = target[realPath[i]];
          }
          // Update the final key
          target[realPath[realPath.length - 1]] = value;
        })
      );
    })
  );

  // When the root object is replaced entirely, reset state
  useEffect(() => {
    if (resetValue) {
      setstate(structuredClone(resetValue));
    }
  }, [resetValue]);

  return [state, objRef.current];
};

export default useImmerObservable;
