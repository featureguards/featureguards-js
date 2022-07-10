const webpack = require('webpack');
const path = require('path');
require('dotenv').config();

module.exports = {
  entry: './src/index.tsx',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'public/dist'),
    filename: 'index.js'
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public')
    },
    compress: true,
    port: 8000
  },
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      FEATUREGUARDS_API_KEY: JSON.stringify(process.env.FEATUREGUARDS_API_KEY)
    })
  ],
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
