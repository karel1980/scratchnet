define(['angular', 'angularRoute'], function (angular) {

    'use strict';

    var app = angular.module('scratchnet', ['ngRoute']);

    app.directive('sn-instance', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                $(element)
                    .css({background: '#ff0'})
                    .droppable({
                        accept: '.svc',
                        activeClass: '.ui-state-hover',
                        hoverClass: '.ui-state-active',
                        drop: function(event, ui) {
                            var svc = jQuery(this).text()
                            var linker = ui.helper.text()
                            alert("Send invitation " + svc + " to " + linker)
                        }
                    })
            }
        }
    })

    return app

});

