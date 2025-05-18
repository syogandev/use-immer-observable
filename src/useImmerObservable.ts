import { useEffect, useRef, useState } from "react";
import { produce } from "immer";

type ObservableCallback = (path: string[], value: any) => void;

const proxyCache = new WeakMap<object, any>();

export const createObservableObject = (
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
        return createObservableObject(value, callback, [
          ...path,
          key.toString(),
        ]);
      }
      return value;
    },
    set(target, key, value) {
      console.log(`target, key, value ${target} ${String(key)} ${value}`);
      target[key] = value; // プロキシ内はミュータブルで更新
      callback([...path, key.toString()], value);

      return true;
    },
  });
  proxyCache.set(obj, proxy);
  return proxy;
};

const useImmerObservable = <T>(obj: T): [T, { set: T }] => {
  const [state, setstate] = useState(structuredClone(obj));
  const [resetValue, setResetValue] = useState<T | undefined>();

  const objRef = useRef<{ set: T }>(
    createObservableObject({ set: obj }, (path, value) => {
      const realPath = path[0] === "set" ? path.slice(1) : path;
      setstate((prev) =>
        produce(prev, (draft) => {
          let target = draft as any;
          if (realPath.length > 0) {
            for (let i = 0; i < realPath.length - 1; i++) {
              //realPath の　最後の手前までオブジェクトの位置を変更していく
              target = target[realPath[i]];
            }
            //realPathの最後がキーとなる
            target[realPath[realPath.length - 1]] = value;
          } else {
            setResetValue(value);
          }
        })
      );
    })
  );

  useEffect(() => {
    if (resetValue) {
      setstate(structuredClone(resetValue));
    }
  }, [resetValue]);

  return [state, objRef.current];
};

export default useImmerObservable;
