let $app = angular.module('app');

$app.directive('inputCalendar', function() {
	return {
		restrict: 'A',
		scope: {
			calendarType: '@calendarType',
			calendarField: '=ngCalendarField',
			calendarStart: '=ngCalendarStart',
			calendarEnd: '=ngCalendarEnd'
		},
		controller: function inputCalendar($element,$scope) {
			this.$onInit = function() {				
				let $input = $($element);
				let $parent = $input.parent('div');
				let type = $scope.calendarType || 'date';

				let format = (type == 'date') ? 'YYYY-MM-DD' : 'HH:mm';
				let icon = (type == 'date') ? 'calendar' : 'clock';
				
				let $wrapper = $('<div class="ui calendar wrapper">');
				let $div = $('<div class="ui input left icon">').appendTo($wrapper);
				let $icon = $('<i class="'+icon+' icon"></i>').appendTo($div);
				$input.appendTo($div);
				$wrapper.appendTo($parent);

				let params = {
					type: type,
					formatter: {
						date(date, settings) {
							return moment(date).format(format);
						}
					},
				    onHide: function () {
						$input.change();
				    },
				};

				let id = $scope.calendarField+'-block';
				$wrapper.attr('id',id);

				let startSelector = $scope.calendarStart;
				let endSelector = $scope.calendarEnd;

				let outroSelector = startSelector || endSelector;
				let outroAtt = (startSelector) ? 'startCalendar' : 'endCalendar';

				if (outroSelector) {
					outroSelector += '-block';
					function setCalendar() {
						let $outro = $('#'+outroSelector);
						if ($outro.length == 0) return setTimeout(setCalendar,100);
						params[outroAtt] = $outro;
						$wrapper.calendar(params);
					}
					setCalendar();
				} else {
					$wrapper.data('calendar-params',params);
					setTimeout(() => $wrapper.calendar(params),100);
				}

				// fix to make sure the calendar is initialized when the input get displayed on the screen
				
				let onVisible = function() {
					// this is called once, when it become visible
					$wrapper.calendar(params); 
					onVisible = null;
				};

				let lastValue = '';
				let wasVisible = false;

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
		}
	};
});