console.log('configuring requirejs')
requirejs.config({

    baseUrl: '/',

    paths: {

        'jquery': 'public/components/jquery/jquery',
        'jquery-ui': 'public/components/jquery-ui/ui/jquery-ui',
        'angular': 'public/components/angular/angular',
        'angularRoute': 'public/components/angular-route/angular-route',

        'bootstrap': 'public/components/sass-bootstrap/dist/js/bootstrap',

        'app': 'public/scratchnet/js/app',
        'config': 'public/scratchnet/js/config',
        'routes': 'public/scratchnet/js/routes',

        'scratchnetController': 'public/scratchnet/js/controllers/scratchnetController',
    },

    shim: {
        'angular': {
            deps: [ 'jquery' ],
            exports: 'angular'
        },
        'angularRoute': {
            deps: [ 'angular' ]
        }
    }
});

require( [
    'jquery',
    'angular',
    'app',
    'routes',
    'bootstrap',
    'jquery-ui',
    'scratchnetController',
    ], function($, angular, app) {
        console.log('About to bootstrap')
        angular.bootstrap(document, ['scratchnet']);
        console.log('done bootstrapping')
    }
);
