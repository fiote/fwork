let $app = angular.module('app');

$app.directive('crud', function() {
	return {
		restrict: 'E',
		transclude: {
			filter: '?filter',
			modal: '?modal'
		},
		scope: {dataset:'=dataset', title:'=title'},
		templateUrl: MODULES.html('base','crud'),
		controller: function($scope,$element,$timeout,$transclude) {
			// retrieving formpage data
			let dataset = $scope.dataset;
			if (!dataset) return;

			$scope.transclude_filter = $transclude.isSlotFilled('filter');
			$scope.transclude_modal = $transclude.isSlotFilled('modal');

			// parsing actions
			$scope.actions = dataset.data && dataset.data.table.actions.map(act => {
				if (act == 'edit') act = {code:'edit',color:'blue', icon:'edit'};
				if (act == 'remove') act = {code:'remove', color:'red', icon:'remove'};
				return act;
			}) || [];
		}
	}
});

angular.crudsCreated = 0;

$app.factory('$crud',function crudFactory($get,$post,$timeout) {
	let defaults = {
		table: {
			columns: [
				'id',
				'name'
			],
			paging: {
				perpage: 10,
				page: 1
			},
			actions: [
				'edit',
				'remove'
			],
			canPage: true,
			canAdd: true
		}
	};
	return function crudFunction($scope,options) {
		$('.modal').remove();
		this.isCrud = true;

		// mixing the options parameter on top of the default data
		angular.crudsCreated++;
		let data = Object.assignNested(defaults,options);
		data.code_modal = data.baseurl.split('/').join('-')+'-'+angular.crudsCreated;

		// interpreting the table columns
		data.table.columns = data.table.columns.map(c => {
			// if they are shortcuts, replace them
			if (c == 'id') return {code: 'id', label: 'Id'};
			if (c == 'name') return {code: 'name', label: 'Name'};
			// if they are just strings, let's parse them
			if (c.constructor === String) {
				// separating code from label (based on the pipe)
				let parts = c.split('|');
				let code = parts[0];
				let label = '?';
				// if there is just the code				
				if (parts.length == 1) {
					// then the label is the 'unslug' version of the name
					label = code.unslug();
				} else {
					// otherside, let's get it
					label = parts[1];
				}
				return {code:code, label:label};
			}
			// but if the column is something else (expected: object), return it
			return c;
		});

		// setting the endpoint for CRUD requests
		const endpoint = MODULES.php(data.baseurl);
		const crud = this;

		// unslugfying the subject to display it better
		data.subject_ucf = data.subject && data.subject.unslug();

		// initializing some data
		crud.data = data;
		crud.list = [];
		crud.loading = false;
		crud.submitting = false;

		// form and errors for the modal
		crud.form = {};
		crud.errors = {};

		// form and errors for the search
		crud.filtergrid = crud.data.filtergrid;
		crud.modalgrid = crud.data.modalgrid;
		crud.search_form = {};
		crud.search_errors = {};

		// form and data for selections
		crud.detailed = crud.data.detailed;

	    // ===================================================
    	// C (create)
    	// ===================================================

    	// then the user clicks the "add x" button, display the modal
		crud.displayAdd = function($e) {
			$e.target.blur();

			let entry = {};
			crud.entry = entry;
			crud.emptyData('errors');
			
			crud.emptyData('form');

			if (data.beforeDisplayAdd) data.beforeDisplayAdd(entry);

			crud.setData('form',entry);

			crud.getModal().modal({
				autofocus: false,
				onApprove(btn) { 
					crud.submitModal(btn);
					return false; 
				},
				onShow() {
					angular.refreshInputs($timeout);
				},
			}).modal('show');
			angular.refreshInputs($timeout);
		};

	    // ===================================================
    	// R (read)
    	// ===================================================

		crud.getList = function(params) {
			if (!params) params = {};
			// storing whatever params were passed to we can forward them when creating a new entry, because this mean this a 'sub' crud
			crud.search_params = Object.clone(params);
			// getting the specified fields if present, so we can fetch less data
			params.fields = data.fields;
			// starting a query string
			let query = params && $.param(params) || '';
			// the crud is now loading
			crud.loading = true;
			// emptying the list since we're requesting it 
			crud.emptyData('list');
			$timeout();
			// actually requesting the list
			$get(endpoint+'/list?'+query).then(crud.gotList);
		};

		crud.gotList = function(feed) {
			// if everything went right
			if (feed.status) {
				// if there is a modal, let's fix some fields based on the modal field
				if (crud.modalgrid) {
					let modalFields = Object.flatFields(crud.modalgrid);
					feed.list.map(row => fixTypedValues(row,modalFields));
				}			
				// transform the data if needed	
				if (data.tableFormatter) feed.list.map(row => data.tableFormatter(row));
				// and update the list
				crud.setData('list',feed.list);
			} else {
				// if not, shows the error
				swal('Oops!',feed.error,'error');
			}
			// the crud is not loading anymore
			crud.loading = false;
			$timeout();
		};

		crud.resetFilters = function($event) {
			crud.emptyData('search_form');
			crud.submitFilters($event);
		};

		crud.submitFilters = function($event) {			
			let filtergrid = [];
			crud.filtergrid.forEach(line => line.forEach(f => filtergrid.push(f)));			
			crud.data.search = [];

			filtergrid.forEach(f => {
				if (f.type == 'select') {
					let id_select = crud.search_form[f.code];
					if (id_select) crud.data.search.push({code:f.code, operator:'==', value:id_select});
				}
				if (f.type == 'text') {
					let text = crud.search_form[f.code];
					if (text) crud.data.search.push({code:f.code, operator:f.operator || '%', value:text.toLowerCase()});
				}
				if (f.type == 'datepicker') {
					let dt_pick = crud.search_form[f.code];
					if (dt_pick) crud.data.search.push({code:f.code, operator:'==', value:dt_pick.date2sql()});
				}
				if (f.type == 'daterangepicker') {
					let dt_min = crud.search_form[f.code+'_start'];
					let dt_max = crud.search_form[f.code+'_end'];
					if (dt_min) crud.data.search.push({code:f.code, operator:'>=', value:dt_min.date2sql()});
					if (dt_max) crud.data.search.push({code:f.code, operator:'<=', value:dt_max.date2sql()});
				}
			});

			crud.list.forEach(x => x._filtered = false);
			$timeout();
		};

		crud.filterRows = function(item) {
			if (item._filtered) return item._fitered_flag;

			let ok = true;
			let anySearch = false;

			if (crud.data.search) {
				crud.data.search.forEach(f => {
					let value = item[f.code];
					if (value) anySearch = true;
					if (f.operator == '==' && value != f.value) ok = false;
					if (f.operator == '>=' && value < f.value) ok = false;
					if (f.operator == '>' && value <= f.value) ok = false;
					if (f.operator == '<' && value >= f.value) ok = false;
					if (f.operator == '<=' && value > f.value) ok = false;
					if (f.operator == '!=' && value == f.value) ok = false;
					if (f.operator == '<>' && value == f.value) ok = false;
					if (f.operator == '%' && !(value && value.toLowerCase().includes(f.value))) ok = false;
				});
			}

			if (!anySearch && data.table.forceSearch) ok = false;

			item._filtered = true;
			item._fitered_flag = ok;

			crud.hideTable = (data.table.hideIfEmpty && !crud.list.find(x => x._fitered_flag));
			return ok;
		};

	    // ===================================================
    	// U (update)
    	// ===================================================

		crud.displayEdit = function($e,entry) {
			crud.entry = entry;
			$($e.target).parents('td').find('button').blur();
			crud.emptyData('errors');
			
			if (data.beforeDisplayEdit) data.beforeDisplayEdit(entry);

			crud.setData('form',entry);
			crud.getModal().modal({
				context: 'body',
				autofocus: false,
				onApprove(btn) { 
					crud.submitModal(btn);
					return false; 
				},
				onShow() {
					angular.refreshInputs($timeout);
				},
			}).modal('show');
			
		};

	    // ===================================================
    	// D (delete)
    	// ===================================================

    	crud.displayRemove = function($e,entry) {
			crud.entry = entry;
			$($e.target).parents('td').find('button').blur();
    		if (data.tableFormatter) entry = data.tableFormatter(entry);
    		if (!data.reference) data.reference = data.table.columns.find(x => x.code != 'id').code;
    		crud.form_reference = entry[data.reference];
    		$timeout(x => crud.askRemove(entry));
    	};

    	crud.askRemove = function(entry) {
    		$timeout();
    		let $content = $('#delete-warning').clone();    		
    		$content.html(crud.form_reference);

    		swal({
    			title: 'Are you sure you want to delete this?',
	    		content: $content[0],
    			icon: 'warning',
				buttons: {
					nevermind: {
						text: "Nevermind"
					},
					delete: {
						text: "Delete it!",
						closeModal: false
					}
				}
    		}).then(flag => {
    			$content.remove();
    			if (flag == 'delete') {
    				$post(endpoint+'/delete',{id:entry.id}).then(crud.gotRemove);
    			}
    		});
    	};

    	crud.gotRemove = function(feed) {
			// when the submit returns
			parseReturnJson(crud,feed,() => {
				// displaying an alert with the result
				swal('Nice!','The '+crud.data.subject+' was removed successfully!','success');
				//  requesting the updated list
				var index = crud.list.indexOf(crud.entry);
				if (index >= 0) crud.list.splice(index,1);
				$timeout();
    		});
    	};

	    // ===================================================
    	// MISC
    	// ===================================================

    	crud.getModal = function() {
    		return $('#modalForm[ref-modal='+crud.data.code_modal+']');
    	};

		crud.submitModal = function(btn) {
			let form = $(btn).parents('.modal').find('form')[0];

			crud.emptyData('errors');

			if (crud.submitting) return console.warn('submitting already');

			// getting the event form
			let $form = $(form);

			// cloning the form data so we can manipulate it without messing the the visible form
			let submitdata = Object.clone(crud.form);

			// if there are search params, let's add them
			if (crud.search_params) submitdata = {...submitdata, ...crud.search_params};

					// parsing the form, getting all inputs marked with checks
			let $inputs = $form.find('[crud-check]');
			$inputs.each((i,input) => {
				// for each one
				let $input = $(input);
				// getting the type of check, the field id and the value
				let check = $input.attr('crud-check');
				let field = $input.attr('crud-field');
				let value = submitdata[field];
				// if it's a required check and the input is empty, it's an error
				if (check == 'required' && !value) crud.errors[field] = true;
			});

			// parsing the form, getting integer fields
			let $integers = $form.find('.integer');
			$integers.each((i,input) => {
				// for each one
				let $input = $(input);
				let field = $input.attr('crud-field');
				let value = submitdata[field];
				if (value === '') submitdata[field] = null;
			});

			// if there are any errors defined, let's return right now
			if (Object.keys(crud.errors).length) {
				console.error('got errors',crud.errors);
				return $timeout();
			}

			submitdata = parseEntryData(submitdata);

			// if everything's fine, let's start the submitting
			crud.submitting = true;
			$timeout();

			// and post the form
			$post(endpoint+'/upsert',submitdata).then(crud.gotSubmit);
		};

		crud.gotSubmit = function(feed) {
			crud.submitting = false;
			// when the submit returns
			parseReturnJson(crud,feed,() => {
				// hiding the modal 
				crud.hideModal();
				// displaying an alert with the result
				var action = (crud.form.id) ? 'updated' : 'added';
				swal('Nice!','The '+crud.data.subject+' was successfully '+action+'!','success');
				if (action == 'updated') {
					if (data.afterUpdate) {
						var refresh = data.afterUpdate(feed);
						if (!refresh) return;
					}
				} else {
					if (data.afterInsert) {
						var refresh = data.afterInsert(feed);
						if (!refresh) return;
					}
				}
				// since a new entry was added, let's request the list again
				crud.getList(crud.search_params);
			});
			$timeout();
		};	

		crud.clickAction = function($event,act,entry) {
			if (act.code == 'edit') return crud.displayEdit($event,entry);
			if (act.code == 'remove') return crud.displayRemove($event,entry);
			crud.clickOtherAction($event,act,entry);
		};

		crud.clickOtherAction = function($event,act,entry) {
		};

		crud.hideModal = function() {
			crud.emptyData('errors');
			crud.getModal().modal('hide');
		};

		// method to setup all the data on an object/array without losing the reference
		crud.setData = function(name,newdata) {
			crud.emptyData(name);
			
			let data = crud[name];
			if (!data) return crud[name] = newdata;

			if (data.constructor == Object) {
				Object.keys(newdata).forEach(k => {
					crud[name][k] = newdata[k];
				});
			}

			if (data.constructor == Array) {
				newdata.forEach(v => crud[name].push(v));
			}
		};

		// method to remove all the data from an object/array without losing the reference
		crud.emptyData = function(name) {
			let data = crud[name];
			if (!data) return;

			if (data.constructor == Object) {
				Object.keys(crud[name]).forEach(k => {
					delete crud[name][k];
				});
			}
			if (data.constructor == Array) {
				while (crud[name].length) crud[name].shift();
			}
		};	

		// setting initial page
		crud.page = 1;

		// after all rows have been loaded/printed
		crud.afterLoaded = function() {
			if (!crud.data.table.canPage) return;
			if (!crud.filteredRows) return;

			let paging = crud.data.table.paging;

			// creating the pagination for the amount of rows
			let qtTotal = crud.filteredRows.length;
			let qtPages = Math.ceil(qtTotal/paging.perpage);

			let pagination = crud.pagination = {pages:[]};

			let firstPages = [];
			let lastPages = [];

			let pages = [];

			if (crud.page > qtPages) crud.page = 1;
			let pnow = crud.page;

			let pmin = pnow-5;
			let pmax = pnow+5;

			if (pmin < 1) {
				pmax -= pmin;
				pmin = 1;
			}
			if (pmax > qtPages) {
				pmin -= (pmax-qtPages);
				pmax = qtPages;
			}

			for (let i = 1; i <= qtPages; i++) {
				let pdata = {number:i, real:true};
				if (i < pmin) {
					firstPages.push(pdata);
				}
				if (i >= pmin && i <= pmax) {
					if (crud.page == i) pdata.active = true;
					pagination.pages.push(pdata);
				}
				if (i > pmax) {
					lastPages.push(pdata);
				}
			}

			if (firstPages.length) {				
				if (firstPages.length > 1) pagination.pages.unshift({number:'...', real:false});
				pagination.pages.unshift(firstPages.shift());
			}

			if (lastPages.length) {					
				if (lastPages.length > 1) pagination.pages.push({number:'...', real:false});
				pagination.pages.push(lastPages.pop());
			}

			$timeout();
		};


		crud.pagingLimit = function() {
			if (crud.data.table.limit) return crud.data.table.limit;
			if (!crud.data.table.canPage) return 999999;
			let paging = crud.data.table.paging;
			return paging.perpage;
		};

		crud.pagingOffset = function() {
			if (crud.data.table.limit) return 0;
			if (!crud.data.table.canPage) return 0;
			let paging = crud.data.table.paging;
			return paging.perpage*(crud.page-1);
		};

		// whenever the filtered rows change
		$scope.$watch(() => {
			return crud.filteredRows && crud.filteredRows.length;
		},(newValue,oldValue) => {
			if (newValue !== oldValue) {
				// check if the new max page is bigger than the current page
				let paging = crud.data.table.paging;
				let qtTotal = newValue;
				let qtPages = Math.ceil(qtTotal/paging.perpage);
				
				// if it is, go back to page 1
				if (crud.page > qtPages) {
					crud.page = 1;
				}
					
				crud.afterLoaded();
			}				
		});

		crud.clickPage = function(number,real) {
			if (!real) return;
			crud.page = parseInt(number);
			crud.afterLoaded();
		};
	}
});

// html filter (render text as html)
$app.filter('html', ['$sce', function ($sce) { 
    return function (text) {
        return $sce.trustAsHtml(text);
    };    
}])


function makeText(list,joiner) {
	// tiny helper to remove empty entries from and array and then join them using a delimiter
	return list.filter(part => part).join(joiner);
}

function tdBlock(p1,p2,p3) {
	let lines = [
		p1 && '<b>'+p1+'</b>',
		p2 && '<small><i>'+p2+'</i></small>',
		p3 && '<small>'+p3+'</small>'
	]
	return lines.filter(x => x).join('<br>');
}