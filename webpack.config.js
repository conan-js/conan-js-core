var HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const ROOT = path.resolve( __dirname, 'src' );

module.exports = {
    context: ROOT,
    mode: 'development',
    entry: './main/main.tsx',
    devtool: 'inline-source-map',
    module: {
        rules: [
            // if you use babel loader, import of css will work
            // {
            //     test: /\.(ts|js)x?$/,
            //     exclude: /node_modules/,
            //     use: {
            //         loader: 'babel-loader'
            //     },
            // },
            {
                test: /\.(ts|js)x?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'awesome-typescript-loader'
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'lib')
    },
    devServer: {
        contentBase: path.join(__dirname, 'lib'),
        compress: true,
        port: 9000
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html"
        })
    ]
};
