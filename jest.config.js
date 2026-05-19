
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/setup.ts"],
  maxWorkers: 1,

  testMatch: ["**/tests/**/*.test.ts"],

  testPathIgnorePatterns: [
    "/dist/",
    "/node_modules/"
  ]
};