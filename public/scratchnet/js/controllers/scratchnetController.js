define(['app', 'config'], function (app) {

    'use strict';

    app.controller('ScratchnetController', ['$scope', 'config', function ($scope, config) {

        //FIXME: whe if the data changes? Do we need to re-enable the draggables?
        $(function() {

          console.log("TTT", $(".linker").length)
          $(".linker").draggable({revert:true})
          $(".service")
            .droppable({
              accept: ".linker",
              activeClass: "ui-state-hover",
              hoverClass: "ui-state-active",
              drop: function( event, ui ) {
                var svc = jQuery(this).text()
                var linker = ui.helper.text()
                //showLinkDialog(svc, linker)
              }
            })

          //TODO: enable drag-n-drop between services and scratchnet instances
        })

        $scope.foo = config.foo
        $scope.services = [
          { id: "svc1" },
          { id: "svc2" },
          { id: "svc3" }
        ]
        $scope.scratchnetInstances = [
          { id: "alice" },
          { id: "bob" }
        ]
        $scope.links = [
          { id: "link1" },
          { id: "link2" }
        ]

        setTimeout(function() {
          console.log("foo")
          $scope.services.push({id: "svc4"})
          $scope.$apply()
        }, 2000)

    }]);

});
