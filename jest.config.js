/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  rootDir: "src",
  setupFilesAfterEnv: ["../jest.setup.js"],
  testEnvironment: "node",
};

module.exports = config;
