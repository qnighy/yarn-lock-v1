/** @type {import('@babel/core').TransformOptions} */
const config = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "12",
        },
        shippedProposals: true,
      },
    ],
    "@babel/preset-typescript",
  ],
  plugins: [
    [
      "@babel/plugin-transform-runtime",
      {
        corejs: { version: 3, proposals: true },
        version: "^7.13.15",
      },
    ],
  ],
};

module.exports = config;
