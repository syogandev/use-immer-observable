import { useCallback, useMemo, useRef, useState } from "react";
import { produce } from "immer";

// Type for callback used when the observable object is mutated
type PropertyChangeCallback = (path: string[], value: any) => void;
/**
 * Debug callback type: called on every property change.
 * @param path - Array of property keys representing the changed path
 * @param value - New value set
 * @param prevValue - Previous value (undefined if not available)
 */
type DebugCallback = (path: string[], value: any, prevValue?: any) => void;

// Recursive Observable type to preserve nested proxy typings
type Observable<T> = T extends object
  ? { [K in keyof T]: Observable<T[K]> }
  : T;
// Proxy wrapper returned by the hook
type SetterProxy<T> = {
  set: Observable<T>;
  update: () => void;
  enableBatch: (batchMode: boolean) => void;
  batch: (updater: () => void) => void;
};

/**
 * useImmerObservable
 *
 * A custom React hook that enables intuitive, mutable-style updates to state,
 * while preserving immutability under the hood using Immer.
 *
 * Batch update APIs (`enableBatch`, `batch`) allow you to group multiple state changes
 * into a single render for performance optimization.
 *
 * You can also initialize batch mode by passing `true` as the second argument to the hook:
 * `useImmerObservable(initialState, true)` will start with batch mode enabled.
 *
 * When batch mode is enabled from the beginning, state changes are not applied immediately.
 * You must call `proxy.update()` after your changes to apply them. This is required for every update while batch mode is enabled.
 *
 * @template T - Type of the initial state object
 * @param {T} obj - The initial state object
 * @param {boolean} [batchMode=false] - (Optional) If true, enables batch mode by default.
 * @returns {[T, SetterProxy<T>]} A tuple with the current state and a proxy-wrapped mutator
 *
 * @example
 * const initial = { user: { name: "Alice", age: 20 } };
 * // Enable batch mode from the beginning
 * const [state, proxy] = useImmerObservable(initial, true);
 *
 * // Normal update
 * proxy.set.user.name = "Bob"; // Updates the state immutably
 *
 * // Batch mode (manual)
 * proxy.enableBatch(true);
 * proxy.set.user.name = "Carol";
 * proxy.set.user.age = 42;
 * proxy.update(); // Apply all changes at once
 * proxy.enableBatch(false);
 *
 * // Batch mode (scoped)
 * proxy.batch(() => {
 *   proxy.set.user.name = "Dave";
 *   proxy.set.user.age = 50;
 * }); // All changes applied in a single render
 *
 * // Replace the entire object
 * proxy.set = { user: { name: "Eve", age: 99 } };
 *
 * @note
 * This hook uses structuredClone internally, so the initial object and any value
 * assigned via `proxy.set = ...` must be structured-cloneable.
 *
 * @note
 * Direct mutations such as `proxy.set.items.push(1)` will NOT trigger updates,
 * because Proxy cannot detect array method calls. To update arrays, always reassign:
 * `proxy.set.items = [...proxy.set.items, 1]`
 *
 * @note
 * Batch update APIs (`enableBatch`, `batch`) can help you combine multiple changes
 * into a single render, improving performance for complex updates.
 */
/**
 * @param {T} obj - The initial state object
 * @param {boolean} [batchMode=false] - (Optional) If true, enables batch mode by default.
 * @param {DebugCallback} [debugCallback] - (Optional) Called on every property change for debugging.
 */
const useImmerObservable = <T extends object>(
  obj: T,
  batchMode: boolean = false,
  debugCallback?: DebugCallback
): [T, SetterProxy<T>] => {
  // State is managed immutably using Immer
  const [state, setState] = useState(obj);
  const proxyCacheRef = useRef(new WeakMap<object, any>());
  const batchQueueRef = useRef<
    { path: (string | number | symbol)[]; value: any }[]
  >([]);
  const batchModeRef = useRef(batchMode);

  /**
   * Recursively wraps an object in a Proxy to observe mutations.
   * Calls the provided callback whenever a property is set.
   */
  const createObservableObject = (
    obj: any,
    callback: PropertyChangeCallback,
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
        const prevValue = target[key];
        target[key] = structuredClone(value);
        callback([...path, key.toString()], value);
        if (debugCallback) {
          debugCallback([...path, key.toString()], value, prevValue);
        }
        return true;
      },
    });
    proxyCache.set(obj, proxy);
    return proxy;
  };

  // Proxy object with mutation callback
  const proxyRef = useRef<SetterProxy<T>>(
    createObservableObject({ set: structuredClone(obj) }, (path, value) => {
      const realPath = path[0] === "set" ? path.slice(1) : path;

      if (realPath.length === 0) {
        // Replacing root object → avoid using produce
        // ルート置換時は Proxy キャッシュをリセット
        proxyCacheRef.current = new WeakMap();
        setState(value);
        return;
      }

      if (batchModeRef.current) {
        // バッチキューに追加
        batchQueueRef.current.push({ path: realPath, value });
        return;
      } else {
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
      }
    })
  );

  const processBatch = useCallback(() => {
    if (batchQueueRef.current.length === 0) return;

    const queuedUpdates = [...batchQueueRef.current];
    batchQueueRef.current = []; // キューをクリア

    setState((prev) => {
      return produce(prev, (draft) => {
        queuedUpdates.forEach(({ path, value }) => {
          let target = draft as any;
          for (let i = 0; i < path.length - 1; i++) {
            target = target[path[i]];
          }
          target[path[path.length - 1]] = value;
        });
      });
    });
  }, []);

  // プロキシに update メソッドを直接追加
  if (!("update" in proxyRef.current)) {
    Object.defineProperty(proxyRef.current, "update", {
      value: () => {
        if (!batchModeRef.current) return;
        processBatch();
      },
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }

  if (!("enableBatch" in proxyRef.current)) {
    Object.defineProperty(proxyRef.current, "enableBatch", {
      value: (batchMode: boolean) => {
        if (batchModeRef.current !== batchMode) {
          batchModeRef.current = batchMode;
          if (!batchMode) {
            processBatch();
          }
        }
      },
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }

  if (!("batch" in proxyRef.current)) {
    Object.defineProperty(proxyRef.current, "batch", {
      value: (updater: () => void) => {
        const prevBatchMode = batchModeRef.current;
        const prevBatchQueue = [...batchQueueRef.current];
        batchModeRef.current = true; // バッチモードを有効化
        batchQueueRef.current = [];
        try {
          updater();
        } catch (error) {
          batchModeRef.current = prevBatchMode;
          batchQueueRef.current = prevBatchQueue;
          throw error;
        }
        processBatch();
        batchModeRef.current = prevBatchMode; // バッチモードを戻す
        batchQueueRef.current = prevBatchQueue;
      },
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }

  return [state, proxyRef.current];
};

export default useImmerObservable;
