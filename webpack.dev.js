const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const portFinderSync = require("portfinder-sync");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    contentBase: "./dist",
    allowedHosts: [".playcurious.games"],
    port: portFinderSync.getPort(8080),
  },
});
