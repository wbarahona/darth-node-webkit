//
// All routes for assets will go here
// ---------------------------------------------------------------------------------------------
module.exports = {
        dev: {
            scripts: './app/assets/scripts',
            fonts: './app/assets/fonts/**/*',
            images: './app/assets/img/**/*',
            styles: './app/assets/sass',
            hbs: {
                    root: './app/assets/templates',
                    partials: './app/assets/templates/partials'
                },
            root: './app'
        },
        dist: {
            scripts: './dist/assets/scripts',
            fonts: './dist/assets/fonts',
            images: './dist/assets/img',
            styles: './dist/assets/css',
            root: './dist'
        }
    }
