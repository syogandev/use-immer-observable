import { act, renderHook } from "@testing-library/react";
import useImmerObservable from "../useImmerObservable";

describe("useImmerObservable batch method", () => {
  it("should restore batch mode after exception", () => {
    const { result } = renderHook(() => useImmerObservable({ a: 0, b: 0 }));

    expect(() => {
      result.current[1].batch(() => {
        result.current[1].set.a = 1;
        result.current[1].set.b = 1;
        throw new Error("test error");
      });
    }).toThrow("test error");
    expect(result.current[0].a).toBe(0);
    expect(result.current[0].b).toBe(0);

    act(() => {
      result.current[1].batch(() => {
        console.log("act null batch");
      });
    });
    expect(result.current[0].a).toBe(0);

    act(() => {
      result.current[1].batch(() => {
        result.current[1].set.a = 2;
      });
    });
    expect(result.current[0].a).toBe(2);
    expect(result.current[0].b).toBe(0);
  });
});
