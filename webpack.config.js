const HtmlWebPackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = [
  {
    entry: './src/js/index.ts',
    output: {
      path: `${__dirname}/dist`,
      filename: 'js/[name]-[hash].js'
    },
    mode: process.env.NODE_ENV ?? 'development',
    devServer: {
      static: {
        directory: `${__dirname}/dist`
      },
      compress: true,
      port: 8060,
      open: true
    },
    module: {
      rules: [
        {
          test: /\.html$/,
          loader: 'html-loader'
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader']
        },
        {
          test: /\.ts$/,
          use: 'ts-loader'
        },
        {
          test: /\.js$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env']
              }
            }
          ]
        },
        {
          test: /\.(png|jpg|gif|svg)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'assets/[name].[ext]'
              }
            }
          ]
        }
      ]
    },
    target: ['web', 'es5'],
    resolve: {
      extensions: ['.ts', '.js']
    },
    plugins: [
      new HtmlWebPackPlugin({
        template: 'src/index.html',
        filename: './index.html'
      }),
      new MiniCssExtractPlugin({
        filename: './css/style-[hash].css'
      }),
      new CopyWebpackPlugin({
        patterns: [{ from: 'src/assets', to: 'assets' }]
      })
    ]
  }
]
