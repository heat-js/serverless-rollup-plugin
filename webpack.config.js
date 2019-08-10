var path = require('path');

module.exports = {
	target: 'node',
  	mode: 'development',
  	entry: './src/lambda.coffee',
  	output: {
    	path: path.resolve(__dirname, './dist/webpack/'),
    	filename: 'bundle.js'
  	},
	module: {
		rules: [
			{
				test: /\.coffee$/,
				use: [ 'coffee-loader' ]
			}
		]
	},
	externals: {
		'aws-sdk': 'aws-sdk'
	}
};
