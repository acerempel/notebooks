import resolve from '@rollup/plugin-node-resolve';
import replace from "@rollup/plugin-replace";
import livereload from 'rollup-plugin-livereload';
import { terser } from "rollup-plugin-terser";
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { babel } from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import jsx from 'acorn-jsx';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import extend from 'postcss-extend-rule';

const production = !process.env.ROLLUP_WATCH;

const replacements = {
  'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
  'process.env.GOTRUE_URL': JSON.stringify(process.env.GOTRUE_URL),
  'process.env.AUDIENCE': JSON.stringify(process.env.AUDIENCE),
  'process.env.EXPIRY_MARGIN': JSON.stringify(process.env.EXPIRY_MARGIN),
  'process.env.STORAGE_KEY': JSON.stringify(process.env.STORAGE_KEY)
};

const postCssConfig = {
  extract: 'styles.css',
  plugins: [
    tailwind, production && autoprefixer,
    extend({ onRecursiveExtend: 'warn', onUnusedExtend: 'warn' })
  ],
  minimize: production
}

export default {
  input: 'src/main.tsx',
  output: {
    file: 'public/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    resolve({ mainFields: ['browser', 'module', 'main'] }),
    commonjs(),
    typescript(),
    babel({ babelHelpers: "bundled", extensions: ['.js', '.jsx', '.ts', '.tsx'] }),
    postcss(postCssConfig),
    json(),
    replace(replacements),
    production && terser({ ecma: 2015 }),
    !production && livereload('public'),
  ],
  acornInjectPlugins: [ jsx() ],
  watch: { clearScreen: false }
};
