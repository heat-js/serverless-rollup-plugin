
const resolve		= require('rollup-plugin-node-resolve');
const { uglify }	= require("rollup-plugin-uglify");
const coffeescript	= require("rollup-plugin-coffee-script");
const commonjs		= require("rollup-plugin-commonjs");

module.exports = {
	plugins: [
		resolve(),
		coffeescript(),
		commonjs(),
        uglify(),
	]
}
