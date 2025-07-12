import { act, renderHook } from "@testing-library/react";
import useImmerObservable from "../useImmerObservable";

describe("useImmerObservable", () => {
  it("updates nested state immutably", () => {
    const initial = { user: { name: "Alice" } };
    const { result } = renderHook(() => useImmerObservable(initial));

    act(() => {
      result.current[1].set.user.name = "Bob";
    });

    expect(result.current[0].user.name).toBe("Bob");
  });

  it("replaces root object", () => {
    const initial = { count: 0 };
    const { result } = renderHook(() => useImmerObservable(initial));

    act(() => {
      result.current[1].set = { count: 42 };
    });

    console.log(`---------- ${JSON.stringify(result.current[0], null, 2)}`);
    expect(result.current[0].count).toBe(42);
  });

  it("updates a.b immutably while preserving a.c", () => {
    const initial = { a: { b: 1, c: { value: 42 } } };
    const { result } = renderHook(() => useImmerObservable(initial));

    const prevA = result.current[0].a;
    const prevB = result.current[0].a.b;
    const prevC = result.current[0].a.c;

    const newB = 0;

    act(() => {
      result.current[1].set.a = { b: newB, c: prevC };
    });

    const nextA = result.current[0].a;
    const nextB = result.current[0].a.b;
    const nextC = result.current[0].a.c;

    // 値の確認
    expect(nextB).toBe(newB);

    // 参照比較
    expect(nextB).not.toBe(prevB); // b はプリミティブで値が変わる
    expect(nextC).toBe(prevC); // c は参照維持（不変）
    expect(nextA).not.toBe(prevA); // a は参照が変わった
  });

  it("array push", () => {
    const initial = { a: { b: 1, c: { value: 42 }, d: [1, 2, 3] } };
    const { result } = renderHook(() => useImmerObservable(initial));

    const prevA = result.current[0].a;
    const prevB = result.current[0].a.b;
    const prevC = result.current[0].a.c;
    const prevD = result.current[0].a.d;

    const newB = 0;

    act(() => {
      result.current[1].set.a.d.push(4);
    });

    const nextA = result.current[0].a;
    const nextB = result.current[0].a.b;
    const nextC = result.current[0].a.c;
    const nextD = result.current[0].a.d;

    expect(nextA).not.toBe(prevA);
    expect(nextB).toBe(prevB);
    expect(nextC).toBe(prevC);
    expect(nextD).not.toBe(prevD);

    // d.push(3) 自体では set トラップは呼ばれないが、
    // 内部で発生する d[3] = 4 や d.length = 4 の set トラップ呼び出しによって
    // 2回 immer で新しいオブジェクトが作られる。
    // 結果としては正しく動作するように見えるが、無駄な更新処理が含まれている。
    // d.push(3) itself does not trigger the set trap,
    // but the internal operations d[3] = 4 and d.length = 4 do trigger the set trap,
    // causing Immer to create a new object twice.
    // As a result, it appears to work correctly, but it includes unnecessary updates.
  });
});
