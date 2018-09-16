window._aGlobalCalls = [];
window._oGlobalCalls = {};

window._anyTracked = false;
window._lastTotal = 0;

var $divTracker = null;

setInterval(function() {
	if (!_anyTracked) return;
	$divTracker.empty();

	var aCalls = _aGlobalCalls.filter(function(g) { return g.qty > 0; });
	aCalls.sort(function(a,b) { return a.qty > b.qty ? -1 : +1; });

	var total = 0;
	
	var now = new Date().getTime();

	aCalls.forEach(function(g) {
		var diff = (now - g.first)/1000;
		g.avg = diff && g.qty/diff;
		g.new = g.qty - g.last;
		total += g.qty;

		var $div = $('<div>').css({'display':'grid','grid-template-columns':'1fr 1fr 2fr 8fr'}).html('<div>'+g.qty+'</div><div>'+g.new+'</div><div>'+(g.avg && g.avg.toFixed(1)+'/s' || '0/s')+'</div><div>'+g.name+'</div>');
		$div.appendTo($divTracker);

		g.last = g.qty;
	});


	_lastTotal = total;	
	// console.log('--------------'); console.log(total+'',diff+'/s' || '0/s','TOTAL');

},1000);

function trackerClass(self) {
	var name = self.constructor.name;
	console.log('trackerClass',name);

	if (!_anyTracked) {
		var $body = $('body');
		$divTracker = $('<div>').css({
			'position':'absolute',
			'width':500,
			'height':408,
			'cursor':'pointer',
			'overflow':'hidden',
			'top':50,
			'right':50,
			'z-index':9999,
			'border':'2px solid black',
			'background':'rgba(255,255,255,0.8)',
			'font-family':
			'Consolas',
			'font-size':'12px',
			'padding':'3px'
		}).appendTo($body);

		// $divTracker.draggable();

		_anyTracked = true;	
	}

	var keys = Object.keys(self);

	keys.forEach(function(key) {
		var vlr = self[key];
		if (typeof vlr == 'function') {
			var keycall = name+'.'+key;

			var g = _oGlobalCalls[keycall];
			if (!g) {
				var g = {name:keycall, last:0, qty:0, first:null};
				_oGlobalCalls[keycall] = g;
				_aGlobalCalls.push(g);
			}

			self[key] = function() {			
				g.qty++;
				if (g.qty == 1) g.first = new Date().getTime();
				return vlr.apply(self,arguments);
			}.bind(self);
		}
	});
};