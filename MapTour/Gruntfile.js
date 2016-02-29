(function() {
	module.exports = function(grunt) {
		var APP_NAME = 'maptour';
		
		grunt.initConfig({
			pkg: grunt.file.readJSON('package.json'),
			
			clean: {
				deploy: ['deploy/*'],
				css: [
					'deploy/app/Responsive.css', 
					'deploy/app/css/', 
					'deploy/app/' + APP_NAME + '-css-app-min.css', 
					'deploy/app/' + APP_NAME + '-css-lib-min.css'
				],
				jsLib: ['deploy/app/lib/'],
				jsTmp: [
					'deploy/app/' + APP_NAME + '-app-viewer-min.js', 
					'deploy/app/' + APP_NAME + '-app-builder-min.js', 
					'deploy/app/' + APP_NAME + '-lib-min.js'
				]
			},
			
			concat: {
				options: {separator: ';'},
				jsLib: {
					src: ['deploy/app/lib/**/*.js'],
					dest: 'deploy/app/' + APP_NAME + '-lib-min.js'
				},
				viewerJS: {
					src: ['deploy/app/' + APP_NAME + '-lib-min.js', 'deploy/app/' + APP_NAME + '-app-viewer-min.js'],
					dest: 'deploy/app/' + APP_NAME + '-viewer-min.js'
				},
				builderJS: {
					src: ['deploy/app/' + APP_NAME + '-lib-min.js', 'deploy/app/' + APP_NAME + '-app-builder-min.js'],
					dest: 'deploy/app/' + APP_NAME + '-builder-min.js'
				},
				css: {
					src: ['deploy/app/' + APP_NAME + '-css-lib-min.css', 'deploy/app/' + APP_NAME + '-css-app-min.css'],
					dest: 'deploy/app/' + APP_NAME + '-min.css'
				}
			},
			
			uglify: {
				jsLib: {
					files: [{
						expand: true,
						cwd: 'src/lib',
						src:['**/*.js'],
						dest: 'deploy/app/lib',
					}]
				}
			},
			
			requirejs: {
			  viewer: {
				options: {
				  baseUrl: "src/app/",
					paths: {
						'dojo': 'empty:',
						'esri': 'empty:',
						'dijit': 'empty:',
						'dojox': 'empty:'
					},
					name: 'storymaps/' + APP_NAME + '/BuildConfigViewer',
					out: 'deploy/app/' + APP_NAME + '-app-viewer-min.js'
				}
			},
			builder: {
				options: {
					baseUrl: "src/app/",
					paths: {
						'dojo': 'empty:',
						'esri': 'empty:',
						'dijit': 'empty:',
						'dojox': 'empty:'
					},
					name: 'storymaps/' + APP_NAME + '/BuildConfigBuilder',
					out: 'deploy/app/' + APP_NAME + '-app-builder-min.js'
				}
			  }
			},
			
			cssmin: {
					app: {
						src: ['deploy/app/css/**/*.css', 'deploy/app/Responsive.css'],
						dest: 'deploy/app/' + APP_NAME + '-css-app-min.css'
					},
					lib: {
						src: ['src/lib/**/*.css'],
						dest: 'deploy/app/' + APP_NAME + '-css-lib-min.css'
					}
				
			},
			
			copy: {
				css: {
					files: [
						{
							expand: 'true',
							cwd: 'src/app/',
							src: ['**/*.css'],
							dest: 'deploy/app/css/'
						}
					]
				},
				html: {
					files: [{
						expand: true,
						cwd: 'src',
						src:['*.html'],
						dest: 'deploy/'
					}]
				},
				resources: {
					files: [{
						expand: true,
						cwd: 'src',
						src:['resources/**'],
						dest: 'deploy/'
					}]
				},
				config: {
					files: [{
						expand: true,
						cwd: 'src',
						src:['app/' + APP_NAME + '-config.js'],
						dest: 'deploy/'
					}]
				},
				bootstrapResources: {
					files: [{
						expand: true,
						cwd: 'src/lib/bootstrap/img/',
						src:['*'],
						dest: 'deploy/resources/bootstrap/'
					}]
				},
				colorboxResources: {
					files: [{
						expand: true,
						cwd: 'src/lib/colorbox/img/',
						src:['*'],
						dest: 'deploy/resources/colorbox/'
					}]
				}
			},
			
			rename: {
				moveResponsiveCss: {
					src: 'deploy/app/css/storymaps/' + APP_NAME + '/ui/Responsive.css',
					dest: 'deploy/app/Responsive.css'
				}
			},
			
			"regex-replace": {
				css: {
					src: ['deploy/app/' + APP_NAME + '-min.css'],
					actions: [
						{
							name: 'Project images path',
							search: '../../(../)*',
							replace: '../',
							flags: 'g'
						},
						{
							name: 'Bootstrap images path',
							search: '../img/',
							replace: '../resources/bootstrap/',
							flags: 'g'
						},
						{
							name: 'Colorbox images path',
							search: 'img/',
							replace: '../resources/colorbox/',
							flags: 'g'
						}
					]
				},
				js: {
					src: ['deploy/app/*.js'],
					actions: [
						{
							name: 'Minified JS variable 1',
							search: 'TPL_ENV_DEV',
							replace: 'TPL_ENV_PRODUCTION'
						},
						{
							name: 'Minified JS variable 2',
							search: 'TPL_PREVIEW_TRUE',
							replace: 'TPL_PREVIEW_FALSE'
						}
					]
				},
				index: {
					src: ['deploy/index.html'],
					actions: [
						{
							name: 'Index.html variables',
							search: 'var isProduction = false;',
							replace: 'var isProduction = true;'
						}
					]
				}
			},
			
			jshint: {
				files: ['src/app/**/*.js'],
				options: {jshintrc: '.jshintrc'}
			},
			
			connect: {
				server: {
					options: {
						port: 8080,
						keepalive: true,
						hostname: '*'
					}
				}
			},
			
			watch: {
				files: ['src/app/**/*.js'],
				tasks: ['jshint']
			}
		});
		
		grunt.loadNpmTasks('grunt-contrib-clean');
		grunt.loadNpmTasks('grunt-contrib-concat');
		grunt.loadNpmTasks('grunt-contrib-uglify');
		grunt.loadNpmTasks('grunt-contrib-requirejs');
		grunt.loadNpmTasks('grunt-contrib-copy');
		grunt.loadNpmTasks('grunt-contrib-cssmin');
		grunt.loadNpmTasks('grunt-regex-replace');
		grunt.loadNpmTasks('grunt-rename');
		grunt.loadNpmTasks('grunt-contrib-jshint');
		grunt.loadNpmTasks('grunt-contrib-connect');
		grunt.loadNpmTasks('grunt-contrib-watch');
		
		grunt.registerTask('test', ['jshint']);
		/* Run 'start grunt server' or 'grunt server &' to create a web server on port 8080 */
		grunt.registerTask('server', ['connect']);
		
		grunt.registerTask('default', [
			/* Comment out to disable code linting */
			'jshint',
			'clean:deploy', 
			
			/* 
			 * Minify and concat external libraries JS using uglify
			 */
			'uglify:jsLib', 
			'concat:jsLib',
			'clean:jsLib',
			
			/*
			 * Minify project JS using require.js
			 * - require.js output a .js for with only the viewer and a .js with viewer and builder
			 * - concat those .js with lib's JS
			 * - perform production mode replacement in JS files
			 */
			'requirejs',
			'concat:viewerJS',
			'concat:builderJS',
			'clean:jsTmp', 
			'regex-replace:js',
			
			/*
			 * Minify CSS
			 * - start by copying all project's css in a tmp folder and exclude Responsive.css
			 * - minify CSS of the application (Responsive.css is added at the end) and libraries CSS
			 * - concat libraries css and application css
			 * - perform resources path replacement
			 */
			'copy:css',
			'rename:moveResponsiveCss',
			'cssmin',
			'concat:css',
			'regex-replace:css',
			'clean:css',
			
			'copy:html',
			'regex-replace:index',
			'copy:config',
			'copy:bootstrapResources',
			'copy:colorboxResources',
			'copy:resources'
		]);
	};
})();