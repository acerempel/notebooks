import resolve from '@rollup/plugin-node-resolve';
import replace from "@rollup/plugin-replace";
import livereload from 'rollup-plugin-livereload';
import { terser } from "rollup-plugin-terser";
import { babel } from '@rollup/plugin-babel';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/main.js',
  output: {
    file: 'public/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    resolve(),
    replace({ 'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development') }),
    babel({ babelHelpers: 'bundled' }),
    !production && terser({ ecma: 2015 }),
    !production && livereload('public'),
  ],
  watch: { clearScreen: false }
};
