let $app = angular.module('app');

$app.directive('baseField', function() {
	return {
		restrict: 'E',
		replace: true,
		scope: {field:'=field', form:'=form', errors:'=errors', crud:'=crud', livesearch:'=livesearch'},
		templateUrl: MODULES.html('base','base-field'),
		controller: function($scope,$element,$get,$timeout) {
			let field = $scope.field;
			let form = $scope.form;
			let livesearch = $scope.livesearch;
			let $input = $($element);

			if (field.baseurl) {
				let parts = field.baseurl.split('/');
				if (parts.length == 1) field.baseurl = field.baseurl+'/'+field.baseurl;
				let endpoint = MODULES.php(field.baseurl);
				
				$get(endpoint+'/list').then(feed => {
					if (feed.status) {
						feed.list.unshift({id:'', name:'...'});
						field.options = feed.list.map(row => ({value:row.id, label:row.name}));
					} else {
						swal('Ops!',feed.error,'error');
					}
					field.loading = false;
				});
			}

			if (livesearch) {
				let $form = $input.parents('form');
				$input.on('change keyup',function($event) { 
					if ($scope.crud) $scope.crud.submitFilters($event);
				});
			}
		}
	};
});

$(document).on('input','input.float',function() {
  	this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
});

$(document).on('input','input.integer',function() {
  	this.value = this.value.replace(/[^0-9]/g, '');
});