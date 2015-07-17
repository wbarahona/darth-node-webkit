var gulp                = require('gulp'),
    concat              = require('gulp-concat'),
    uglify              = require('gulp-uglify'),
    sourcemaps          = require('gulp-sourcemaps'),
    livereload          = require('gulp-livereload'),
    sass                = require('gulp-sass'),
    minifyCSS           = require('gulp-minify-css'),
    rename              = require('gulp-rename'),
    connect             = require('gulp-connect'),
    build               = require('gulp-build'),
    jshint              = require('gulp-jshint'),
    transform           = require('vinyl-transform'),
    source              = require('vinyl-source-stream'),
    browserify          = require('browserify'),
    handlebars          = require('gulp-compile-handlebars'),
    templObj            = require('./conf/web.conf'),
    pathObj             = require('./conf/paths.conf'),
    buffer              = require('vinyl-buffer'),
    child               = require('child_process'),
    NwBuilder           = require('nw-builder');

var paths = pathObj,
    templateData = templObj,
    childProcesses      = {};

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use all packages available on npm

// Server related tasks
gulp.task('express', function() {
    var express = require('express');
    var app = express();
    app.use(require('connect-livereload')({port: 4002}));
    app.use(express.static(__dirname));
    app.listen(4000);
});

var tinylr;
gulp.task('livereload', function() {
    tinylr = require('tiny-lr')();
    tinylr.listen(4002);
});

function notifyLiveReload(event) {
    var fileName = require('path').relative(__dirname, event.path);

    tinylr.changed({
        body: {
            files: [fileName]
        }
    });
}

gulp.task('connect', function () {
    connect.server ({
        root: [paths.dist.root],
        port: 8000,
        livereload: true
    })
});

//
// Process node-webkit app build
// ---------------------------------------------------------------------------------------------------------------
function startNodeWebkit () {
    if (childProcesses['node-webkit']) childProcesses['node-webkit'].kill();
    // TODO: get the windows application, this works for mac only
    var nwProcess = childProcesses['node-webkit'] = child.spawn('/Applications/nwjs.app/Contents/MacOS/nwjs', ['./dist']);

    nwProcess.stderr.on('data', function (data) {
        var log = data.toString().match(/\[.*\]\s+(.*), source:.*\/(.*)/);
        if (log) process.stdout.write('[node] '+log.slice(1).join(' ')+'\n');
    });
}

gulp.task('node-webkit', startNodeWebkit);

// Press [ENTER] to manually restart nw.
process.stdin.on('data', function (data) {
    if (data.toString() === '\n') startNodeWebkit();
});

// Build a standalone app
gulp.task('node-webkit-build', function() {
    var nw = new NwBuilder({
        files: paths.dist.root+'/**/**', // use the glob format
        platforms: ['osx64', 'win32', 'win64']
    });

    //Log stuff you want

    nw.on('log',  console.log);

    // Build returns a promise
    nw.build().then(function () {
        console.log('all done!');
    }).catch(function (error) {
        console.error(error);
    });
});

//
// Process all assets, scripts, image minification and sass preprocessing
// ---------------------------------------------------------------------------------------------------------------

gulp.task('lint', function() {
    return gulp.src(paths.dev.scripts)
    .pipe(jshint())
    // You can look into pretty reporters as well, but that's another story
    .pipe(jshint.reporter('default'));
});

//Min all scripts
gulp.task('scripts', function() {
    // Minify and copy all JavaScript
    // with sourcemaps all the way down
    return browserify({
        debug: true,
        entries: [paths.dev.scripts+'/scripts.js']
    }).bundle()
    .pipe(source('scripts.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(paths.dist.scripts))
    .pipe(connect.reload());
});

// Process Templating with Handlebars
gulp.task('hbs', function () {
    var options = {
        ignorePartials: true,
        batch : [paths.dev.hbs.partials],
        helpers : {
            capitals : function(str){
                return str.toUpperCase();
            }
        }
    }

    return gulp.src([paths.dev.hbs.root+'/**/*.hbs', '!'+paths.dev.hbs.root+'/partials/**/*.hbs'])
    .pipe(handlebars(templateData, options))
    .pipe(rename(function(path) {
        path.extname = '.html';
    }))
    .pipe(gulp.dest(paths.dist.root))
    .pipe(connect.reload());
});

// Process all html
gulp.task('html', function () {
    gulp.src(paths.dev.root+'/index.html')
    .pipe(rename('index.html'))
    .pipe(gulp.dest(paths.dist.root));

    return gulp.src(paths.dist.root+'/index.html')
    .pipe(connect.reload());
});

// Copy all fonts files
gulp.task('fonts', function() {
    gulp.src(paths.dev.fonts)
    .pipe(gulp.dest(paths.dist.fonts));

    return gulp.src(paths.dist.fonts)
    .pipe(connect.reload());
});

// Copy package dot json file
// we need the package for the node webkit builder
// TODO: Fonts and package into a miscelaneous task copy?
gulp.task('pack', function() {
    gulp.src('./package.json')
    .pipe(gulp.dest(paths.dist.root));
});

// Copy all static images
gulp.task('images', function() {
    gulp.src(paths.dev.images)
    .pipe(gulp.dest(paths.dist.images));

    return gulp.src(paths.dist.images)
    .pipe(connect.reload());
});

// Minify scss
gulp.task('sass', function () {
    return gulp.src(paths.dev.styles+'/styles.scss')
    .pipe(sass())
    .pipe(gulp.dest(paths.dist.styles))
    .pipe(concat('styles.min.css'))
    .pipe(gulp.dest(paths.dist.styles))
    .pipe(minifyCSS())
    .pipe(rename('styles.min.css'))
    .pipe(gulp.dest(paths.dist.styles))
    .pipe(connect.reload());
});

//
// Watch over the files modified
// ---------------------------------------------------------------------------------------------------------------

// Rerun the task when a file changes
gulp.task('watch', function() {
    gulp.watch([paths.dev.scripts+'/**/*.js'], ['lint']);
    gulp.watch([paths.dev.scripts+'/**/*.js'], ['scripts']);
    gulp.watch(paths.dev.images, ['images']);
    gulp.watch([paths.dev.styles+'/**/*.scss'], ['sass']);
    gulp.watch([paths.dev.hbs.root+'/**/*.hbs'], ['hbs']);
});

//
// $ gulp et voila
// ---------------------------------------------------------------------------------------------------------------
// The default task (called when you run `gulp` from cli)
gulp.task('default', ['lint', 'scripts', 'hbs', 'fonts', 'images', 'sass', 'pack', 'express', 'livereload', 'connect', 'watch']);

//
// End any living node-webkit process when exiting gulp process
// ---------------------------------------------------------------------------------------------------------------
process.on('exit', function () {
  for (var c in childProcesses) childProcesses[c].kill();
});
