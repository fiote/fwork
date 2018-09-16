let $app = angular.module('app');

$app.controller('loginController',function($scope,$state,$post,$timeout) {
	let ctrl = this;

	ctrl.form = {};
	ctrl.errors = {};

	ctrl.submit = function() {
		ctrl.errors = {};

		if (!ctrl.form.username) ctrl.errors.username = true;
		if (!ctrl.form.password) ctrl.errors.password = true;
		if (Object.keys(ctrl.errors).length) return;

		ctrl.loading = true;
		$timeout();

		$post('modules/accounts/submit',ctrl.form).then(feed => {
			ctrl.loading = false;
			if (feed.status) {
				$state.go('home');
			} else {
				if (feed.errorcode) {
					ctrl.errors = {};
					ctrl.errors[feed.errorcode] = true;
				} 
				if (feed.error) {
					swal('Oops!',feed.error,'error');
				}
			}		
			$timeout();
		});
	};
});