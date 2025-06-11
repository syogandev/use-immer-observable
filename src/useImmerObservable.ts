import { useRef, useState } from "react";
import { produce } from "immer";

// Type for callback used when the observable object is mutated
type ObservableCallback = (path: string[], value: any) => void;

// Recursive Observable type to preserve nested proxy typings
type Observable<T> = T extends object ? { [K in keyof T]: Observable<T[K]> } : T;
// Proxy wrapper returned by the hook
type SetterProxy<T> = { set: Observable<T> };

/**
 * useImmerObservable
 *
 * A custom React hook that allows mutable-style updates to state,
 * while preserving immutability under the hood using Immer.
 *
 * @template T - Type of the initial state object
 * @param {T} obj - The initial state object
 * @returns {[T, SetterProxy<T>]} A tuple with the current state and a proxy-wrapped mutator
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
const useImmerObservable = <T extends object>(obj: T): [T, SetterProxy<T>] => {
  // State is managed immutably using Immer
  const [state, setState] = useState(structuredClone(obj));
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
        // 直接代入。Immer 側で不変性が担保されるため deep clone は不要
        target[key] = value;
        callback([...path, key.toString()], value);

        return true;
      },
    });
    proxyCache.set(obj, proxy);
    return proxy;
  };

  // Proxy object with mutation callback
  const objRef = useRef<SetterProxy<T>>(
    createObservableObject({ set: structuredClone(obj) }, (path, value) => {
      const realPath = path[0] === "set" ? path.slice(1) : path;

      if (realPath.length === 0) {
        // Replacing root object → avoid using produce
        // ルート置換時は Proxy キャッシュをリセット
        proxyCacheRef.current = new WeakMap();
        setState(value);
        return;
      }

      setState((prev) =>
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
