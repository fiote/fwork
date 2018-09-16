let $app = angular.module('app');

$app.directive('formgrid', function() {
	return {
		restrict: 'E',
		scope: {title:'=title', grid:'=grid', form:'=form', errors:'=errors', livesearch:'=livesearch', crud:'=crud'},
		templateUrl: MODULES.html('base','formgrid'),
		controller: function($scope,$get,$timeout,$sce) {
			var form = this;

			// if the grid is an array of objects
			if ($scope.grid && $scope.grid[0] && $scope.grid[0].constructor == Object) {
				// let's transform it into an array of arrays of objects
				let newgrid = [];
				let newline = null;
				let columns = 999;

				$scope.grid.forEach(entry => {
					if (columns >= 16) {
						newline = [];
						newgrid.push(newline);
						columns = 0;
					}
					if (entry.type == 'fill') {
						if (columns == 0) return;
						if (!entry.cols) entry.cols = 16-columns;
					}

					newline.push(entry);
					if (Number.isInteger(entry.cols)) columns += entry.cols;
				});

				$scope.grid = newgrid;
			}

			// then let's udpate the columns data
			if ($scope.grid) {
				let sized = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen'];				
				$scope.grid.forEach(line => {
					line.forEach(field => {
						field.cols = field.cols || 4;
						field.width = sized[field.cols] || field.cols;

						if (typeof field.label == 'undefined') field.label = field.code && field.code.unslug();

						field.placeholder = field.placeholder || field.label;
						field.type = field.type || 'text';
						
						let ftype = field.type;
						let aClasses = [];
						if (field.extraclass) aClasses.push(field.extraclass);

						if (ftype == 'float') {
							ftype = 'text';
							aClasses.push('float');
						}

						field.symbol_exists = (field.symbol) ? true : false;
						field.presymbol_exists = (field.presymbol) ? true : false;
						field.x_symbol_exists = (field.symbol_exists || field.presymbol_exists);

						if (field.symbol) {
							field.symbol_wrapper = 'ui right labeled input';
						}
						
						if (field.presymbol) {
							field.symbol_wrapper = 'ui left labeled input';
						}

						if (ftype == 'select' && field.options && field.options.constructor == String) {
							var pts = field.options.split('-');
							if (pts.length == 2) {
								var min = parseInt(pts[0]);
								var max = parseInt(pts[1]);
								field.options = [{value:'', label:'...'}];
								for (let n = min; n <= max; n++)  field.options.push({value: n, label: n});
							}
							aClasses.push('n-select');
						}

						if (ftype == 'yesno' || ftype == 'yesnona') {
							field.options = [
								{value:'',label:'...'},
								{value:1, label:'Yes'},
								{value:0, label:'No'},
							];

							if (ftype == 'yesnona') {
								field.options.push({value:2, label:'N/A'});
							}

							aClasses.push('wid100');
							ftype = 'select';
						}

						if (ftype == 'cutoff') {
							field.options = [
								{value:'',label:'...'},
								{value:10, label:'Above Cutoff'},
								{value:0, label:'Near Cutoff'},
								{value:-10, label:'Below Cutoff'},
							];
							ftype = 'select';
						}

						// genderu = gender + unknown
						if (ftype == 'gender' || ftype == 'genderu') {
							let words = field.words || ['Male','Female'];

							field.options = [
								{value:'', label:'...'},
								{value:'M', label: words[0]},
								{value:'F', label: words[1]}
							];

							aClasses.push('wid120');
							if (ftype == 'genderu') field.options.push({value:'U', label:'Unknown'});
							ftype = 'select';
						}

						if (ftype == 'textarea') {
							if (!field.rows) field.rows = 3;
						}


						if (ftype == 'integer') {
							ftype = 'text';
							aClasses.push('integer');
						}

						if (ftype == 'daterangepicker') {
							field.code_start = field.code+'_start';
							field.code_end = field.code+'_end';
						}

						if (field.text) {
							field.text = $sce.trustAsHtml(field.text);
							field.inline = true;
						}

						field.isText = ftype == 'text';
						field.isTextarea = ftype == 'textarea';
						field.isSelect = ftype == 'select';
						field.isCheckbox = ftype == 'checkbox';
						field.isColorPicker = ftype == 'colorpicker';
						field.isDatePicker = ftype == 'datepicker';
						field.isTimePicker = ftype == 'timepicker';
						field.isDateRangePicker = ftype == 'daterangepicker';
						field.isButton = ftype == 'button';


						field.isObservation = ftype == 'obs';
						field.isLabel = ftype == 'label';
						field.isTitle = ftype == 'title';
						field.isSubTitle = ftype == 'subtitle';

						field.extraclass = aClasses.join(' ');
					});
				});
			}
		}
	};
});

angular.refreshInputs = function($timeout) {
	$timeout(function() {
		$('.search.select.dropdown:visible').each(function() {
			let $input = $(this).find('[input-search]');
			var value = $input.val();
			if (value) $input.dropdown('set selected',value);
		});
	});
};