let $app = angular.module('app');

$app.config(function($stateProvider) {
	$stateProvider.state('login',{
		url: '/login',
		...createTemplateResolve({auth:false, module:'accounts', page:'login'})
	});

	$stateProvider.state('logout',{
		url: '/logout',
		...createTemplateResolve({module:'accounts', page:'logout'})
	});
});