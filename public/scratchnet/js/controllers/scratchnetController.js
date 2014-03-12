define(['app', 'config'], function (app) {

    'use strict';

    app.controller('ScratchnetController', ['$scope', 'config', function ($scope, config) {

        $scope.foo = config.foo
        $scope.services = [
          { value: { name: 'svc1' }},
          { value: { name: 'svc2' }},
          { value: { name: 'svc3' }}
        ]
        $scope.scratchnetInstances = [
          { id: 'alice' },
          { id: 'bob' }
        ]
        $scope.links = [
          { id: 'link1' },
          { id: 'link2' }
        ]

        $.getJSON('/data/services', function(data) {
          $scope.services = data
          $scope.$apply()
        })

    }]);

});
