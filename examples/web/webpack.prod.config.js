const webpack = require('webpack');
const path = require('path');
require('dotenv').config();

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: './src/index.tsx',
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      FEATUREGUARDS_API_KEY: JSON.stringify(process.env.FEATUREGUARDS_API_KEY)
    })
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js'
  },
  // plugins: [new BundleAnalyzerPlugin()],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx']
  }
};
