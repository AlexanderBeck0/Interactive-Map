import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';

export default {
  input: 'scripts/map.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife'
  },
  external: ['mapbox-gl', 'module2'],
  plugins: [
    resolve(),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: ['@babel/preset-env'],
      plugins: [
        ['babel-plugin-transform-import-ignore', { "patterns": [".css"] }]
      ]
    })
  ]
};
