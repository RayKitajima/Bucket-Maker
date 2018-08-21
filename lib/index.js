
"use strict";

const Maker = require('./maker');

module.exports.createBucket = function(options){
	return new Maker(options);
};
