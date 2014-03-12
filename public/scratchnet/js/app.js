define(['angular', 'angularRoute'], function (angular) {

    'use strict';

    var app = angular.module('scratchnet', ['ngRoute']);

    app.directive('snInstance', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                console.log("I see your instance")
                $(element)
                    .addClass('instance')
                    .css({background: '#ff0'})
                    .droppable({
                        accept: '.service',
                        activeClass: '.ui-state-hover',
                        hoverClass: '.ui-state-active',
                        drop: function(event, ui) {
                            var svc = ui.helper.text()
                            var inst = jQuery(this).text()
                            alert("TODO: send invitation for " + svc + " to " + inst)
                        }
                    })
            }
        }
    })

    app.directive('snService', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                console.log("I see your service")
                $(element)
                    .addClass('service')
                    .css({background: '#f0f'})
                    .draggable({ revert: true })
            }
        }
    })

    return app

});

