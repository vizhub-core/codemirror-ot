import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';

const external = ['@codemirror/state', 'assert', 'ot-json0' ];
const output = {
  format: 'cjs',
  sourcemap: true,
};
const plugins = [nodeResolve(), commonjs()];

export default [
  {
    external,
    input: './src/index.js',
    output: { ...output, file: './dist/codemirror-ot.js' },
    plugins,
  },
  {
    external,
    input: './test/extension.js',
    output: { ...output, file: './dist/test/extension.js' },
    plugins,
  },
  {
    external,
    input: './test/translation.js',
    output: { ...output, file: './dist/test/translation.js' },
    plugins,
  },
];
