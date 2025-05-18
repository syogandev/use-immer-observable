import { useEffect, useRef, useState } from "react";
import { produce } from "immer";

// Type for callback used when the observable object is mutated
type ObservableCallback = (path: string[], value: any) => void;

/**
 * useImmerObservable
 *
 * A custom React hook that allows mutable-style updates to state,
 * while preserving immutability under the hood using Immer.
 *
 * @template T - Type of the initial state object
 * @param {T} obj - The initial state object
 * @returns {[T, { set: T }]} A tuple with the current state and a proxy-wrapped mutator
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
 * @note: Direct mutations like `proxy.set.items.push(1)` won’t trigger updates,
 * because Proxy cannot detect internal array method calls.
 * Instead, reassign the array: `proxy.set.items = [...proxy.set.items, 1]`
 */
const useImmerObservable = <T>(obj: T): [T, { set: T }] => {
  // State is managed immutably using Immer
  const [state, setstate] = useState(structuredClone(obj));
  const proxyCacheRef = useRef(new WeakMap<object, any>());

  /**
   * Recursively wraps an object in a Proxy to observe mutations.
   * Calls the provided callback whenever a property is set.
   */
  const createObservableObject = (
    obj: any,
    callback: ObservableCallback,
    path: string[] = []
  ): any => {
    const proxyCache = proxyCacheRef.current;
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
        setstate(structuredClone(value));
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

  return [state, objRef.current];
};

export default useImmerObservable;
