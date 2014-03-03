define(['app', 'scratchnetController'], function (app) {

    'use strict';

    app.config(['$routeProvider', function ($routeProvider) {

        $routeProvider.
            when('/', {
                templateUrl: './public/scratchnet/templates/scratchnet.html',
                controller: 'ScratchnetController'
            });
    }]);
});
