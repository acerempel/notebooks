import resolve from '@rollup/plugin-node-resolve';
import replace from "@rollup/plugin-replace";
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { babel } from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import jsx from 'acorn-jsx';
import tailwind from 'tailwindcss';
import extend from 'postcss-extend-rule';

const ci = process.env.CI;
const production = !process.env.ROLLUP_WATCH && !ci;

const replacements = {
  'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
  'process.env.GOTRUE_URL': JSON.stringify(process.env.GOTRUE_URL),
  'process.env.AUDIENCE': JSON.stringify(process.env.AUDIENCE),
  'process.env.EXPIRY_MARGIN': JSON.stringify(process.env.EXPIRY_MARGIN),
  'process.env.STORAGE_KEY': JSON.stringify(process.env.STORAGE_KEY)
};

const postCssConfig = async () => ({
  extract: 'styles.css',
  plugins: [
    tailwind, production && (await import('autoprefixer')).default,
    extend({ onRecursiveExtend: 'warn', onUnusedExtend: 'warn' })
  ],
  minimize: production
})


function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn('yarn', ['run', 'start'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    }
  };
}

export default (async () => ({
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
    postcss(await postCssConfig()),
    json(),
    replace(replacements),
    production && (await import('rollup-plugin-terser')).terser({ ecma: 2015 }),
    (!production && !ci) && (await import('rollup-plugin-livereload')).default('public'),
    !production && serve(),
  ],
  acornInjectPlugins: [ jsx() ],
  watch: { clearScreen: false }
}));
