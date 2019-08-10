
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const _	= require('lodash');
const Rollup = require('rollup');

const SERVERLESS_FOLDER		= '.serverless'
const BUILD_FOLDER			= '.rollup';
const PREFERRED_EXTENSIONS	= [ '.coffee', '.js', '.ts', '.jsx', '.tsx' ];

class ServerlessPluginRollup {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;

		this.hooks = {
			'before:package:createDeploymentArtifacts': this.build.bind(this),
			'after:package:createDeploymentArtifacts': this.clean.bind(this),
		};
	}

	get functions() {
		const { options } = this;
		const { service } = this.serverless;

		if (options.function) {
			return {
				[options.function]: service.functions[this.options.function]
			}
		}

		return service.functions;
	}

	getEntryExtension(fileName) {
		const files = glob.sync(`${fileName}.*`, {
			cwd: this.serverless.config.servicePath,
			nodir: true,
			// ignore: this.configuration.excludeFiles ? this.configuration.excludeFiles : undefined
		});

		if (!files.length) {
			// If we cannot find any handler we should terminate with an error
			throw new this.serverless.classes.Error(
				`No matching handler found for '${fileName}' in '${
				this.serverless.config.servicePath
				}'. Check your service definition.`
			);
		}

		// Move preferred file extensions to the beginning
		const sortedFiles = _.uniq(
			_.concat(
				_.sortBy(_.filter(files, file => _.includes(PREFERRED_EXTENSIONS, path.extname(file))), a => _.size(a)),
				files
			)
		);

		if (_.size(sortedFiles) > 1) {
			this.serverless.cli.log(
				`WARNING: More than one matching handlers found for '${fileName}'. Using '${_.first(sortedFiles)}'.`
			);
		}

		return path.extname(_.first(sortedFiles));
	};

	get rootFileNames() {
		return Object.values(this.functions).map((fn) => {
			const filename	= fn.handler.split('.')[0];
			const ext		= this.getEntryExtension(filename);

			return filename + ext;
		});
	}

	newFileName (filename) {
		let newFileName = filename.split('.');
		newFileName.pop();
		newFileName = newFileName.join('.');
		newFileName += '.js';
		return newFileName;
	}

	async build() {
		this.serverless.cli.log('Compiling rollup...');

		const rollupConfig = require(path.join(this.serverless.config.servicePath, 'rollup.config.js'));

		// this.functions
		for(let filename of this.rootFileNames) {
			const newFileName = this.newFileName(filename);

			rollupConfig.input = path.join(this.serverless.config.servicePath, filename);

			// console.log(path.join(this.serverless.config.servicePath, 'rollup.config.js'));
			// console.log(rollupConfig);


			// console.log(path.join(this.serverless.config.servicePath, BUILD_FOLDER, filename));


			const bundle = await Rollup.rollup(rollupConfig);

			await bundle.write({
				format: 'cjs',
				file: path.join(this.serverless.config.servicePath, BUILD_FOLDER, newFileName),
			});
		}

		// if (!this.originalServicePath) {
		// 	// Save original service path and functions
		// 	this.originalServicePath = this.serverless.config.servicePath
		// 	// Fake service path so that serverless will know what to zip
		// 	this.serverless.config.servicePath = path.join(this.originalServicePath, BUILD_FOLDER)
		// }



		// if (!fs.existsSync(dirname)) {
		// 	fs.mkdirpSync(dirname)
		// }
	}

	async moveArtifacts() {
		console.log('111');

		const { service } = this.serverless;

		// await fs.copy(
		// 	path.join(this.originalServicePath, BUILD_FOLDER, SERVERLESS_FOLDER),
		// 	path.join(this.originalServicePath, SERVERLESS_FOLDER)
		// );

		if (this.options.function) {
			const fn = service.functions[this.options.function];
			console.log(fn);

			fn.package.artifact = path.join(
				this.originalServicePath,
				SERVERLESS_FOLDER,
				path.basename(fn.package.artifact)
			);
			return
		}

		// if (service.package.individually) {
		// 	const functionNames = service.getAllFunctions()
		// 	functionNames.forEach(name => {
		// 		service.functions[name].package.artifact = path.join(
		// 			this.originalServicePath,
		// 			SERVERLESS_FOLDER,
		// 			path.basename(service.functions[name].package.artifact)
		// 		)
		// 	})
		// 	return
		// }

		if(service.package.artifact) {
			console.log(fn);
			service.package.artifact = path.join(
				this.originalServicePath,
				SERVERLESS_FOLDER,
				path.basename(service.package.artifact)
			);
		}
	}

	async clean() {
		this.serverless.cli.log('Cleaning rollup...');
		// this.serverless.config.servicePath = this.originalServicePath;
		await this.moveArtifacts();
		fs.removeSync(path.join(this.originalServicePath, BUILD_FOLDER));
	}
}


module.exports = ServerlessPluginRollup;
