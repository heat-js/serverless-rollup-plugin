
const resolve		= require('rollup-plugin-node-resolve');
const { uglify }	= require("rollup-plugin-uglify");
const coffeescript	= require("rollup-plugin-coffee-script");
const commonjs		= require("rollup-plugin-commonjs");
const ignore 		= require('rollup-plugin-ignore');
const json			= require('rollup-plugin-json');

module.exports = {
	plugins: [
		resolve({
			preferBuiltins: true,
			extensions: ['.js', '.coffee', '.json'],
		}),
		ignore(['aws-sdk']),
		json(),
		coffeescript(),
		commonjs({ extensions: ['.js', '.coffee'] }),
        // uglify(),
	]
}
