const path = require("path");

const webpack = require('webpack');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');


//invocation: webpack --mode=production --node-env=production
module.exports = (env, argv) => {
  //const production = argv.mode === 'production';
  //console.log("process.env.NODE_ENV", process.env.NODE_ENV);

  const production = process.env.NODE_ENV === 'production';
  const devMode = !production;

  return {

    plugins: [
      // workaround for issue in @blueprintjs/core v3.45.0 with webpack 5  
      // see  https://github.com/palantir/blueprint/issues/4393
      new webpack.DefinePlugin({
        "process.env": "{}",
        global: {}
      })

    ]
      .concat(devMode ? [] : [new MiniCssExtractPlugin(
        {
          filename: '[name].css',
          chunkFilename: '[id].css',         
        }

      )]),

    entry: {
      main: "./src/index.tsx"
    },

    module: {
      rules: [
        {
          test: /\.s?css$/,
          use: [

            devMode
              // Creates `style` nodes from JS strings
              ? 'style-loader'
              : {
                loader: MiniCssExtractPlugin.loader,
                options: {
                },
              },

            // Translates CSS into CommonJS
            'css-loader',

            // Compiles Sass to CSS          
            'sass-loader'
          ]
        },

        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            "loader": "ts-loader",
            "options": {
              "transpileOnly": true
            }
          }
        },

        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            "loader": "babel-loader",
            "options": {
              "presets": [
                "env",
                "react"
              ]
            }
          }
        },

        {
          test: /\.(png|jp(e*)g|svg|gif)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                //  name: 'images/[hash]-[name].[ext]',
              },
            },
          ],
        },
      ]
    },

    resolve: {
      extensions: [".tsx", ".ts", ".js"]
    },

    optimization: {

      minimizer: [
        //extend existing minimizers
        `...`,

        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
              },
            ],
          },
        }),
      ],
    },

    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js"

    },


    devServer: {
      static: path.join(__dirname, "dist"),
      compress: true,
      port: 9000
    }
  }
};
