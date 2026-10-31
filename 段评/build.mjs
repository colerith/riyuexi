import path from 'node:path';
import webpack from 'webpack';
import { commentArtifactsPlugin } from './build-tools.mjs';
const root = import.meta.dirname;
const outputRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'release');
const compiler = webpack({
  mode: 'production',
  target: ['web', 'es2020'],
  entry: path.join(root, 'index.ts'),
  output: { path: path.join(root, '.build'), filename: 'index.js' },
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [
      { resourceQuery: /raw/, type: 'asset/source' },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: { transpileOnly: true, configFile: path.join(root, 'tsconfig.build.json') },
      },
    ],
  },
  plugins: [commentArtifactsPlugin(root, outputRoot)],
});
compiler.run((error, stats) =>
  compiler.close(closeError => {
    if (error || closeError || stats?.hasErrors()) {
      console.error(error || closeError || stats.toString({ all: false, errors: true }));
      process.exitCode = 1;
    } else console.log(stats.toString({ all: false, assets: true }));
  }),
);
