
"use strict";

const os = require('os');

const bucket_maker = require('../lib/index.js');

// get 5sec(msec) bucket maker
let bucket = bucket_maker.createBucket({
	unit   : 5000,
	dumper : function(items){ return items.map( x => JSON.stringify(x) ).join('\n') },
});

// put timestamp to the
setInterval(function(){
	bucket.put(os.loadavg());
},1000);

