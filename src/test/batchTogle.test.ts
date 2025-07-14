import { act, renderHook } from "@testing-library/react";
import useImmerObservable from "../useImmerObservable";

describe("batch mode switching", () => {
  it("should apply pending updates when turning off batch mode", () => {
    const initial = { count: 0 };
    const { result } = renderHook(() => useImmerObservable(initial, true));

    // バッチモードで複数回更新
    act(() => {
      result.current[1].set.count = 1;
      result.current[1].set.count = 2;
    });

    // まだ更新されていないことを確認
    expect(result.current[0].count).toBe(0);

    // バッチモードをオフにすると保留中の更新が適用される
    act(() => {
      result.current[1].enableBatch(false);
    });

    // 最後の状態が反映されている
    expect(result.current[0].count).toBe(2);

    // これ以降の更新は即時反映される
    act(() => {
      result.current[1].set.count = 3;
    });
    expect(result.current[0].count).toBe(3);
  });

  it("should not apply updates when turning on batch mode", () => {
    const initial = { count: 0 };
    const { result } = renderHook(() => useImmerObservable(initial, false));

    // バッチモードをオンに
    act(() => {
      result.current[1].enableBatch(true);
    });

    // バッチモードで更新
    act(() => {
      result.current[1].set.count = 1;
      result.current[1].set.count = 2;
    });

    // まだ更新されていないことを確認
    expect(result.current[0].count).toBe(0);

    // 明示的に更新を適用
    act(() => {
      result.current[1].update();
    });

    // 最後の状態が反映されている
    expect(result.current[0].count).toBe(2);
  });

  it("should handle nested updates when switching modes", () => {
    const initial = { user: { name: "Alice", age: 25 } };
    const { result } = renderHook(() => useImmerObservable(initial, true));

    // バッチモードで更新
    act(() => {
      result.current[1].set.user.name = "Bob";
      result.current[1].set.user.age = 30;
    });

    // バッチモードをオフにすると保留中の更新が適用される
    act(() => {
      result.current[1].enableBatch(false);
    });

    // すべての更新が反映されている
    expect(result.current[0]).toEqual({
      user: { name: "Bob", age: 30 },
    });

    // 新しい更新は即時反映される
    act(() => {
      result.current[1].set.user.age = 31;
    });
    expect(result.current[0].user.age).toBe(31);
  });

  it("should handle root replacement when switching modes", () => {
    const initial = { count: 0, user: { name: "Alice" } };
    const { result } = renderHook(() => useImmerObservable(initial, true));

    // バッチモードでルート置換
    const newData = { count: 10, user: { name: "Bob" } };
    act(() => {
      result.current[1].set = newData;
      result.current[1].set.user.name = "Charlie"; // すぐに反映されない
    });

    expect(result.current[0]).toEqual({
      count: 10,
      user: { name: "Bob" }, // "Charlie" にはならない
    });

    // バッチモードをオフにすると保留中の更新が適用される
    act(() => {
      result.current[1].enableBatch(false);
    });

    // ルート置換が適用され、その後の更新は無視される
    expect(result.current[0]).toEqual({
      count: 10,
      user: { name: "Charlie" }, // "Charlie" になる
    });
  });
});
