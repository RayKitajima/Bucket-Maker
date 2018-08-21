
"use strict";

const bucket_maker = require('../lib/index.js');

// get 5sec(msec) bucket maker
let bucket = bucket_maker.createBucket({
	unit: 5000
});

// put timestamp to the
setInterval(function(){
	bucket.put(Date.now());
},1000);

