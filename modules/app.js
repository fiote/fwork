let $app = angular.module('app', ['ui.router']);

window.MODULES = {
	// data
	path: '/modules',
	// html	
	html(folder,name) { return this.path+'/'+folder+'/html/'+name+'.html'; },
	// php
	php(call) { return this.path+'/'+call; },
	// js
	js(folder,name) { return this.path+'/'+folder+'/js/'+name+'.js'; }
};

// =============================================================
//	OBJECT
// =============================================================

Object.clone = function(source) {
	return source && JSON.parse(JSON.stringify(source)) || {};
};

Object.flatFields = function(fields) {
	let flat = [];
	fields.forEach(f => {
		if (f && f.constructor == Array) {
			f.forEach(f2 => flat.push(f2));
		} else {
			flat.push(f);
		}
	});
	return flat;
};

Object.reset = function(obj) {
	Object.keys(obj).forEach(key => {
		obj[key] = null;
	});
};

Object.set = function(obj1,obj2) {
	Object.forEach(obj2,(key,value) => obj1[key] = value);
};

Object.assignNested = function(obj1,obj2) {
	let got1 = typeof obj1 != 'undefined';
	let got2 = typeof obj2 != 'undefined';
	if (got1 && !got2) return obj1;
	if (got2 && !got1) return obj2;

	if (obj1.constructor == Object && obj2.constructor == Object) {
		let data = {...obj1, ...obj2};	
		Object.keys(data).forEach(key => {
			data[key] = Object.assignNested(obj1[key],obj2[key]);
		});		
		return data;
	}

	return obj2;
};

Object.forEach = function(obj,callback) {
	Object.keys(obj).forEach(key => callback(key,obj[key])); 
};

// =============================================================
//	BASE ROUTING
// =============================================================

if (location.href.indexOf('#!/') < 0)  location.href = './#!/';

// $app.run($trace => $trace.enable(1));

$app.config(['$locationProvider',function($locationProvider) {
  	$locationProvider.html5Mode(false);
}]);

// =============================================================
//	TEMPLATES
// =============================================================

// method to make routing/creating resolves easier
window.createTemplateResolve = function(opts = {}) {
	let resolve = {};

	// if there is no page, assume the page as the module itself
	if (!opts.page) opts.page = opts.module;

	// if this page is restricted, check it as well
	if (typeof opts.auth == 'undefined') opts.auth = true;
	if (opts.auth) {
		resolve.authorize = function($get,$state) {
			return new Promise(function(success,failure) {
				$get('modules/accounts/isLogged').then((feed) => {
					// if we're logged return the promise success so the route can be resolved
					if (feed.logged) {
						return success();
					}
					// otherside, send the user to the login page
					$state.go('login');
				});
			});
		};
	}

	// returning the resolve
	let data = {
		templateUrl: 'modules/'+opts.module+'/html/'+opts.page+'.html',
		resolve: resolve
	};

	return data;
}

// method to wait for a set of fields to be filled on a base variable
window.waitValues = function(base,fields) {
	return new Promise(resolve => {
		var missing = [];
		fields.forEach(f => { if (!base[f]) missing.push(f); });
		if (!missing.length) resolve();
		else setTimeout(x => waitValues(base,fields).then(resolve),100);
	});
}

// =============================================================
//	POST/GET (FACTORY)
// =============================================================

$app.factory('$get',['$http',function($http) {
	return function(url) {
		return new Promise((resolve,reject) => {
			$http({url: url, method: 'GET', headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
				.then(output => resolve(output.data))
				.catch(output => resolve({status:false, error:'[GET] '+output.statusText+' (more info on the console/request)', errorcode:output.status}));
		});
	};
}]);


$app.factory('$post',['$http',function($http) {
	return function(url,data) {
		return new Promise((resolve,reject) => {
			$http({url: url, method: 'POST', data: data && $.param(data), headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
				.then(output => resolve(output.data))
				.catch(output => resolve({status:false, error:'[POST] '+output.statusText+' (more info on the console/request)', errorcode:output.status}));
		});
	};
}]);

// =============================================================
//	JSON
// =============================================================

window.parseEntryData = function(entry,keep) {
	// cloning the data
	if (!keep) entry = JSON.parse(JSON.stringify(entry));
	// removing attributes that starts with $ (angular stuff) or _ (transform stuff)
	Object.keys(entry).filter(k => k[0] == '$' || k[0] == '_').forEach(k => delete entry[k]);
	// returning the cleaned entry
	return entry;
};

window.parseReturnJson = function(ctrl,feed,callback) {
	ctrl.loading = false;
	if (feed.status) {
		callback();
	} else {
		if (feed.errorcode) {
			ctrl.errors = {};
			ctrl.errors[feed.errorcode] = true;
		} 
		if (feed.error) {
			if (feed.error.indexOf('Duplicate entry') >= 0) feed.error = 'There is already an entry with this data.';
			swal('Oops!',feed.error,'error');
		}
	}
};

// =============================================================
//	STRING
// =============================================================

String.prototype.unslug = function() {
	if (!this) return this;
	return this.split('_').join(' ').split(' ').map(word => word.ucfirst()).join(' ');
};

String.prototype.slug = function() {
	if (!this) return this;
	return this.toLowerCase().split(' ').join('-');
};

String.prototype.ucfirst = function() {
	if (!this) return this;
	return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
};

String.prototype.date2sql = function() {
	return this;
};

String.prototype.sql2date = function() {	
	if (this == '0000-00-00') return '';
	return this;
};

String.prototype.age = function(reference) {
	let parts_old = this.split('-');
	if (parts_old.length != 3) return;

	let yearNow = moment(reference).format('YYYY');
	let yearOld = moment(this).format('YYYY');
		
	let dateNow = moment(reference).format('MM-DD');
	let dateOld = moment(this).format('MM-DD');

	let qtYears = parseInt(yearNow) - parseInt(yearOld);
	if (dateNow < dateOld) qtYears--;

	return qtYears;
};