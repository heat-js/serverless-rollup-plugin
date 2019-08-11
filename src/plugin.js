
const fs		= require('fs-extra');
const path		= require('path');
const glob		= require('glob');
const _			= require('lodash');
const Rollup	= require('rollup');

const SERVERLESS_FOLDER		= '.serverless'
const BUILD_FOLDER			= '.rollup';
const PREFERRED_EXTENSIONS	= [ '.coffee', '.js', '.ts', '.jsx', '.tsx' ];

class ServerlessPluginRollup {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;

		this.hooks = {
			'before:package:createDeploymentArtifacts': this.build.bind(this),
			'after:package:createDeploymentArtifacts':	this.clean.bind(this),
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
		const { dir, name } = path.parse(filename);
		return path.join(dir, name + '.js');
	}

	loadRollupConfig() {
		const { custom } = this.serverless.service
		if(custom && custom.rollup && custom.rollup.config) {
			const config = custom.rollup.config
			if(_.isString(config)) {
				const filePath = path.join(this.serverless.config.servicePath, config);
				if (!this.serverless.utils.fileExistsSync(filePath)) {
					throw new this.serverless.classes.Error(
						`The webpack plugin could not find the configuration file at: ${filePath}`
					);
				}
				try {
					return require(filePath);
				} catch (err) {
					this.serverless.cli.log(`Could not load webpack config '${filePath}'`);
					throw err;
				}
			}
		}

		return require('./rollup.config.js');
	}

	async build() {
		this.serverless.cli.log('Compiling rollup...');

		const rollupConfig = this.loadRollupConfig()

		for(let filename of this.rootFileNames) {
			const newFileName = this.newFileName(filename);

			rollupConfig.input = path.join(this.serverless.config.servicePath, filename);

			const bundle = await Rollup.rollup(rollupConfig);
			await bundle.write({
				format: 'cjs',
				file: path.join(this.serverless.config.servicePath, BUILD_FOLDER, newFileName),
			});
		}

		if (!this.originalServicePath) {
			// Save original service path and functions
			this.originalServicePath = this.serverless.config.servicePath
			// Fake service path so that serverless will know what to zip
			this.serverless.config.servicePath = path.join(this.originalServicePath, BUILD_FOLDER)
		}
	}

	async moveArtifacts() {
		const { service } = this.serverless;

		await fs.copy(
			path.join(this.originalServicePath, BUILD_FOLDER, SERVERLESS_FOLDER),
			path.join(this.originalServicePath, SERVERLESS_FOLDER)
		);

		if (this.options.function) {
			const fn = service.functions[this.options.function];
			fn.package.artifact = path.join(
				this.originalServicePath,
				SERVERLESS_FOLDER,
				path.basename(fn.package.artifact)
			);
			return
		}

		if (service.package.individually) {
			const functionNames = service.getAllFunctions()
			functionNames.forEach(name => {
				service.functions[name].package.artifact = path.join(
					this.originalServicePath,
					SERVERLESS_FOLDER,
					path.basename(service.functions[name].package.artifact)
				)
			})
			return
		}

		if(service.package.artifact) {
			service.package.artifact = path.join(
				this.originalServicePath,
				SERVERLESS_FOLDER,
				path.basename(service.package.artifact)
			);
		}
	}

	async clean() {
		this.serverless.cli.log('Cleaning rollup...');
		this.serverless.config.servicePath = this.originalServicePath;
		await this.moveArtifacts();
		fs.removeSync(path.join(this.originalServicePath, BUILD_FOLDER));
	}
}

module.exports = ServerlessPluginRollup;
