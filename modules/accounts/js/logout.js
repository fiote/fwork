let $app = angular.module('app');

$app.controller('logoutController', function($post,$state,$timeout) {
	$post('modules/accounts/logout').then(feed => {
		$state.go('login');
		$timeout();
	});
});