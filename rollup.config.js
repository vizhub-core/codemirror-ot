import typescript from 'rollup-plugin-typescript2'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
  input: './src/index.ts',
  output: {
    format: 'cjs',
    file: './dist/codemirror-ot.js',
    sourcemap: true
  },
  plugins: [
    nodeResolve(),
    typescript({
      check: false,
      tsconfigOverride: {
        compilerOptions: {
          lib: ['es5', 'es6', 'dom'],
          sourceMap: true,
          target: 'es5',
          strict: false
        },
        include: null
      }
    }),
    commonjs()
  ]
}
