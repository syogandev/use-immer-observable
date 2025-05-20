// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom", // DOMが必要なReactテスト用
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/test/**/*.test.ts?(x)"],
};
