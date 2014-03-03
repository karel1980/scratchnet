define(['app', 'config'], function (app) {

    'use strict';

    app.controller('ScratchnetController', ['$scope', 'config', function ($scope, config) {

        $scope.foo = config.foo
        $scope.services = [
          { id: "svc1" },
          { id: "svc2" },
        ]
        $scope.scratchnetInstances = [
          { id: "alice" },
          { id: "bob" }
        ]
        $scope.links = [
          { id: "link1" },
          { id: "link2" }
        ]


    }]);

});
