import { act, renderHook } from "@testing-library/react";
import useImmerObservable from "../useImmerObservable";
import { logObject } from "./util";

describe("batch updates", () => {
  it("batches multiple updates", () => {
    const initial = { count: 0, user: { name: "Alice", age: 25 } };
    const { result } = renderHook(() => useImmerObservable(initial, true)); // batchMode: true

    // 複数の更新を実行（まだ反映されない）
    act(() => {
      result.current[1].set.count = 5;
      result.current[1].set.user.name = "Bob";
      result.current[1].set.user.age = 30;
    });

    // まだ更新されていないことを確認
    expect(result.current[0]).toEqual(initial);

    // 明示的に更新を適用
    act(() => {
      result.current[1].update();
    });

    // すべての更新が反映されていることを確認
    expect(result.current[0]).toEqual({
      count: 5,
      user: { name: "Bob", age: 30 },
    });
  });

  it("handles root replacement in batch mode", () => {
    const initial = { count: 0, user: { name: "Alice" } };
    const { result } = renderHook(() => useImmerObservable(initial, true));

    {
      const afterData = { ...initial, count: 10 };
      // ルートオブジェクトを置換
      act(() => {
        result.current[1].set = afterData;
        result.current[1].set.user.name = "Charlie"; // この更新は無視されるべき
      });

      logObject(result.current[0]);
      // まだ更新されていないことを確認
      expect(result.current[0]).toEqual(afterData);
      expect(result.current[0].user.name).toEqual("Alice");

      // 更新を適用
      act(() => {
        result.current[1].update();
      });

      logObject(result.current[0]);

      // ルート置換が優先され、その後の更新は無視される
      expect(result.current[0]).toEqual({
        count: 10,
        user: { name: "Charlie" }, // "Charlie" にはならない
      });
    }

    //updateがroot置き換え後も正しく動作するか
    {
      const afterData = { ...initial, count: 30 };
      // ルートオブジェクトを置換
      act(() => {
        result.current[1].set = afterData;
        result.current[1].set.user.name = "Bob"; // この更新は無視されるべき
      });

      logObject(result.current[0]);
      // まだ更新されていないことを確認
      expect(result.current[0]).toEqual(afterData);
      expect(result.current[0].user.name).toEqual("Alice");

      // 更新を適用
      act(() => {
        result.current[1].update();
      });

      logObject(result.current[0]);

      // ルート置換が優先され、その後の更新は無視される
      expect(result.current[0]).toEqual({
        count: 30,
        user: { name: "Bob" }, // "Bob" にはならない
      });
    }
  });

  it("handles nested updates in batch mode", () => {
    const initial = { a: { b: { c: 1, d: 2 }, e: 3 } };
    const { result } = renderHook(() => useImmerObservable(initial, true));

    // 複数のネストされた更新
    act(() => {
      result.current[1].set.a.b.c = 10;
      result.current[1].set.a.e = 30;
    });

    // まだ更新されていないことを確認
    expect(result.current[0]).toEqual(initial);

    // 更新を適用
    act(() => {
      result.current[1].update();
    });

    // すべての更新が反映されていることを確認
    expect(result.current[0]).toEqual({
      a: { b: { c: 10, d: 2 }, e: 30 },
    });
  });
});
