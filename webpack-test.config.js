const path = require('path');

const ROOT = path.resolve( __dirname, 'test' );

module.exports = {
    context: ROOT,

    resolve: {
        extensions: ['.ts', '.js'],
        modules: [
            ROOT,
            'node_modules'
        ]
    },

    module: {
        rules: [
            // PRE-LOADERS
            {
                enforce: 'pre',
                main: /\.js$/,
                use: 'source-map-loader'
            },

            // LOADERS
            {
                main: /\.(ts|js)x?$/,
                exclude: [ /node_modules/ ],
                use: 'awesome-typescript-loader'
            }
        ]
    },

    devtool: 'cheap-module-source-map',
    devServer: {}
};

