import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";

export default {
  external: ["@datavis-tech/codemirror-6-prerelease"],
  input: "./src/index.ts",
  output: {
    format: "cjs",
    file: "./dist/codemirror-ot.js",
    sourcemap: true
  },
  plugins: [nodeResolve(), commonjs()]
};
