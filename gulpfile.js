const gulp = require('gulp'); const babel = require('gulp-babel');
const concat = require('gulp-concat');
const less = require('gulp-less');
const cleancss = require('gulp-clean-css');
const del = require('del');
const fs = require('fs');
const notify = require("gulp-notify");
const removeEmptyLines = require('gulp-remove-empty-lines');
const folderDestination = './dist';

const MINIFY = false;

// ==============================================
// ERROR HANDLING
// ==============================================

var reportError = function (error) {
    var lineNumber = (error.lineNumber) ? 'LINE ' + error.lineNumber + ' -- ' : '';

    notify({
        title: 'Task Failed [' + error.plugin + ']',
        message: lineNumber + 'See console.',
        sound: 'Sosumi'
    }).write(error);

    console.log(error.message);
    this.emit('end');
}

// ==============================================
// JAVASCRIPT
// ==============================================

const jsFiles = 'modules/*/js/*.js';
const jsRoutes = 'modules/*/*.js';
const jsApp = 'modules/app.js';
const babelPresets = ['stage-0','env'];

// ==============================================
// LESS
// ==============================================

const lessFiles = 'modules/*/less/*.less';
const cleancssOptions = {
	compatibility: 'ie11',
	rebase: false,
	level: {
		1: {
			transform: function (propertyName, propertyValue, selector) {
				if (propertyValue.indexOf('../../../plugins') >= 0) {
					propertyValue = propertyValue.replace('../../../', '/');
					return propertyValue;
				}
				if (propertyValue.indexOf('../fontAwesome') >= 0) {
					return propertyValue.replace('../', '/plugins/');
				}
				if (propertyValue.indexOf('../fonts/fontawesome-webfont') >= 0) {
					return propertyValue.replace('../fonts','../plugins/fontAwesome/fonts');					
				}
				return propertyValue.replace(/\((.*M\_BASE)/,(a, b) => '(/modules/base');
			}
		}
	}
};

// ==============================================
// PLUGINS
// ==============================================

function addPlugins(mainList,folder,list) { list.forEach(file => mainList.push('plugins/'+folder+'/'+file)); }

const jsPlugins = [];
addPlugins(jsPlugins,'jquery',['jquery.min.js']);
addPlugins(jsPlugins,'sweetAlert',['sweetAlert.js']);
addPlugins(jsPlugins,'semanticUI',['semantic.min.js','calendar/calendar.min.js']);
addPlugins(jsPlugins,'angularjs',['angular.min.js','angular-ui-router.min.js']);
addPlugins(jsPlugins,'moment',['moment.min.js','moment-duration-format.min.js']);

const cssPlugins = [];
addPlugins(cssPlugins,'semanticUI',['semantic.min.css','calendar/calendar.min.css']);
addPlugins(cssPlugins,'fontAwesome',['css/font-awesome.min.css']);

// ==============================================
// TASK-JS
// ==============================================

function logErrorJS(e) {
	console.log('logErrorJS', e.message);
	notify(e.message);
	return;

	if (!e) e = {'message':''};
	var content = e.message && 'console.error('+JSON.stringify(e.message)+');' || '/* no errors found */';
	fs.writeFile(folderDestination+'/app.status-js.js',content,function() { console.log(e.message); });
}

function logErrorCSS(e) {
	console.log('logErrorCSS', e.message);
	notify(e.message);
	return;

	if (!e) e = {'message':''};
	var content = e.message && 'console.error('+JSON.stringify(e.message)+');' || '/* no errors found */';
	fs.writeFile(folderDestination+'/app.status-css.js',content,function() { console.log(e.message); });
}

gulp.task('bundle-js',function() {
	gulp.src(jsApp)
		.pipe(babel({presets:babelPresets, minified:MINIFY, comments:false}))
    	.on('error', reportError)
		.pipe(concat('app.min.js'))
		.pipe(removeEmptyLines())
		.pipe(gulp.dest(folderDestination));

	gulp.src([jsFiles,jsRoutes])
		.pipe(babel({presets:babelPresets, minified:MINIFY, comments:false}))
    	.on('error', reportError)
		.pipe(concat('modules.min.js'))
		.pipe(removeEmptyLines())
		.pipe(gulp.dest(folderDestination));
});

// ==============================================
// TASK-LESS
// ==============================================

gulp.task('bundle-less',function() {
	gulp.src([lessFiles])
		.pipe(less())
		.on('error',logErrorCSS)
    	.pipe(cleancss(cleancssOptions))
		.pipe(concat('modules.min.css'))
		.pipe(removeEmptyLines())
		.pipe(gulp.dest(folderDestination));
});

// ==============================================
// TASK-PLUGINS
// ==============================================

gulp.task('bundle-plugins',function() {
	gulp.src(jsPlugins)
		.pipe(concat('plugins.min.js'))
		.on('error',logErrorJS)
		.pipe(removeEmptyLines())
		.pipe(gulp.dest(folderDestination));

	gulp.src(cssPlugins)
    	.pipe(cleancss(cleancssOptions))
		.on('error',logErrorCSS)
		.pipe(concat('plugins.min.css'))
		.pipe(removeEmptyLines())
		.pipe(gulp.dest(folderDestination));
});

// ==============================================
// TASK-DEFAULT
// ==============================================

gulp.task('default', function() {
	gulp.run('bundle-js');
	gulp.run('bundle-less');
	gulp.run('bundle-plugins');
});

// ==============================================
// WATCHNERS
// ==============================================

gulp.watch([jsFiles,jsRoutes,jsApp]).on('change',() => {
	gulp.run('bundle-js');
});

gulp.watch(lessFiles).on('change',() => {
	gulp.run('bundle-less');
});