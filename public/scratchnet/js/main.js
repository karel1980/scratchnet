requirejs.config({

    baseUrl: '/',

    paths: {

        //'jquery': 'components/jquery/jquery',

        'angular': 'public/components/angular/angular',
        'angularRoute': 'public/components/angular-route/angular-route',

        'scratchnetController': 'public/scratchnet/js/controllers/scratchnetController',

        'app': 'public/scratchnet/js/app',
        'config': 'public/scratchnet/js/config',
        'routes': 'public/scratchnet/js/routes'
    },

    shim: {

        /*'jquery': {
            exports: 'jQuery'
        },*/
        'angular': {
            deps: [ 'jquery' ],
            exports: 'angular'
        },
        'angularRoute': {
            deps: [ 'angular' ]
        }
    }
});


require([

    'angular',
    'config',
    'routes'

], function(angular) {

    'use strict';

    angular.bootstrap(document, ['scratchnet']);
});

