describe("Jest Sanity Test", () => {
  it("should pass basic math", () => {
    expect(1 + 1).toBe(2);
  });

  it("should compare strings", () => {
    expect("hello").toMatch(/hell/);
  });

  it("should check object equality", () => {
    expect({ a: 1 }).toEqual({ a: 1 });
  });
});
