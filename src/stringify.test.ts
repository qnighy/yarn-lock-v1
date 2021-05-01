import { describe, expect, it } from "@jest/globals";

import { sortWithPriority, stringify, wrapKey } from "./stringify";

describe("stringify", () => {
  it("stringifies an empty object", () => {
    const s = stringify({});
    expect(s).toMatchSnapshot();
  });

  it("stringifies an object with a single key", () => {
    const s = stringify({
      foo: {},
    });
    expect(s).toMatchSnapshot();
  });

  it("stringifies simple values", () => {
    const s = stringify({
      foo: {
        numeric: 42,
        snumeric: "42",
        boolean: false,
        sboolean: "true",
        s: "baz",
        s2: "baz baz",
      },
    });
    expect(s).toMatchSnapshot();
  });

  it("stringifies package info", () => {
    const s = stringify({
      "call-bind@^1.0.2": {
        version: "1.0.2",
        resolved: "https://registry.yarnpkg.com/call-bind/-/call-bind-1.0.2.tgz#b1d4e89e688119c3c9a903ad30abb2f6a919be3c",
        integrity: "sha512-7O+FbCihrB5WGbFYesctwmTKae6rOiIzmz1icreWJ+0aA7LJfuqhEso2T9ncpcFtzMQtzXf2QGGueWJGTYsqrA==",
        dependencies: {
          "function-bind": "^1.1.1",
          "get-intrinsic": "^1.0.2",
        },
      },
      "has-symbols@^1.0.1": {
        version: "1.0.2",
        resolved: "https://registry.yarnpkg.com/has-symbols/-/has-symbols-1.0.2.tgz#165d3070c00309752a1236a479331e3ac56f1423",
        integrity: "sha512-chXa79rL/UC2KlX17jo3vRGz0azaWEx5tGqZg5pO3NUyEJVB17dMruQlzCCOfUvElghKcm5194+BCRvi2Rv/Gw==",
      },
      "is-regex@^1.1.2": {
        version: "1.1.2",
        resolved: "https://registry.yarnpkg.com/is-regex/-/is-regex-1.1.2.tgz#81c8ebde4db142f2cf1c53fc86d6a45788266251",
        integrity: "sha512-axvdhb5pdhEVThqJzYXwMlVuZwC+FF2DpcOhTS+y/8jVq4trxyPgfcwIxIKiyeuLlSQYKkmUaPQJ8ZE4yNKXDg==",
        dependencies: {
          "call-bind": "^1.0.2",
          "has-symbols": "^1.0.1",
        },
      },
    });
    expect(s).toMatchSnapshot();
  });

  it("doesn't unify same primitives", () => {
    const s = stringify({
      foo: {
        foo: 42,
        bar: 42,
      }
    });
    expect(s).toMatchSnapshot();
  });

  it("doesn't unify equivalent objects", () => {
    const s = stringify({
      foo: {
        foo: { something: 42 },
        bar: { something: 42 },
      }
    });
    expect(s).toMatchSnapshot();
  });

  it("unifies identical objects", () => {
    const obj = { something: 42 };
    const s = stringify({
      foo: {
        foo: obj,
        bar: obj,
      }
    });
    expect(s).toMatchSnapshot();
  });

  it("unifies identical toplevel objects", () => {
    const obj = {
      version: "0.1.2",
    };
    const s = stringify({
      "foo@^0.1.0": obj,
      "foo@^0.1.1": obj,
      "foo@^0.2.0": {
        version: "0.2.0",
      },
    });
    expect(s).toMatchSnapshot();
  });
});

describe("wrapKey", () => {
  it("wraps key conditionally", () => {
    const src: (string | number | boolean)[] = [
      1234,
      "1234",
      "foo",
      "@babel/core",
      "webpack@^4.46.0",
      "webpack@4.x || 5.x",
      "https://example.com/",
      true,
      "true",
      "trues",
      "atrue",
      false,
      "false",
      "falsey",
      "afalse",
      "a\nb",
      "foo[bar]",
      "a\\b",
    ];
    const wrapped = src.map((k) => [k, wrapKey(k)] as const);
    expect(wrapped).toEqual([
      [1234, "1234"],
      ["1234", '"1234"'],
      ["foo", "foo"],
      ["@babel/core", '"@babel/core"'],
      ["webpack@^4.46.0", "webpack@^4.46.0"],
      ["webpack@4.x || 5.x", '"webpack@4.x || 5.x"'],
      ["https://example.com/", '"https://example.com/"'],
      [true, "true"],
      ["true", '"true"'],
      ["trues", '"trues"'],
      ["atrue", "atrue"],
      [false, "false"],
      ["false", '"false"'],
      ["falsey", '"falsey"'],
      ["afalse", "afalse"],
      ["a\nb", '"a\\nb"'],
      ["foo[bar]", '"foo[bar]"'],
      ["a\\b", '"a\\\\b"'],
    ]);
  });
});

describe("cmpAlpha", () => {
  it("Sorts strings alphabetically", () => {
    const sorted = sortWithPriority([
      "foo",
      "name",
      "ばー",
      "valueOf",
      "uid",
      "registry",
      "баз",
      "version",
      "dependencies",
      "hasOwnProperty",
      "resolved",
      "isPrototypeOf",
      "integrity",
    ]);
    expect(sorted).toEqual([
      "name",
      "version",
      "uid",
      "resolved",
      "integrity",
      "registry",
      "dependencies",
      "foo",
      "hasOwnProperty",
      "isPrototypeOf",
      "valueOf",
      "баз",
      "ばー",
    ]);
  });
});
