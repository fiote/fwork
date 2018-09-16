let $app = angular.module('app');

$app.directive('inputSearch', function() {
	return {
		restrict: 'A',
		scope: {loading:'=loading', crud:'=crud'},
		controller: function($scope,$element) {
			let ctrl = this;
			let crud = $scope.crud;

			ctrl.$onInit = function() {
				let $input = $($element);
				$input.dropdown({placeholder: false}).dropdown('set selected','');

				return;

				let watchValue = $scope.$watch(function() {
					// if the input was just appeared, let's initialize it
					let isVisible = $input.is(':visible');
					if (isVisible) {
						if (!wasVisible) {
							$wrapper.calendar(params); 
						}
					} 					
					wasVisible = isVisible;

					// if the value changed, let's update it
					var currentValue = $input.val();
					if (currentValue != lastValue) {
						$wrapper.calendar('set date',currentValue);
					}

					lastValue = currentValue;						
				});
			};

			ctrl.tryAddSeach = function() {
				if ($scope.loading) return setTimeout(ctrl.tryAddSeach,100);
				let $input = $($element);
				$input.dropdown({placeholder: false}).dropdown('set selected',$input.val());
			}
		}
	};
});