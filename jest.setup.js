const { afterEach, beforeEach } = require("@jest/globals");
const nock = require("nock");

beforeEach(() => {
  if (!nock.isActive) nock.activate();
});
afterEach(() => {
  nock.restore();
});
