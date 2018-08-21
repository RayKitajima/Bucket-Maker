
"use strict";

const cronJob = require('cron').CronJob;
const fs      = require('fs');
const path    = require('path');

const DAY_UNIT = 3600*24*1000; // 1day (msec)

const default_dumper = function(items){
	return items.join('\n');
};

const default_log = function(msg){
	console.log(msg);
};

const default_writer = function(maker){
	let names = Object.keys(maker.Buckets);
	let now = Date.now();
	for( let i=0; i<names.length; i++ ){
		if( maker.Buckets[names[i]].cutoff > now ){ continue; } // skip: still putting into the bucket
		let dump = maker.dumper(maker.Buckets[names[i]].buffer);
		let file_name = maker.prefix + names[i] + maker.suffix;
		let file_path = path.resolve(maker.spool,file_name);
		
		let fd = fs.openSync(file_path,'a+');
		fs.writeSync(fd,dump);
		fs.closeSync(fd);
		delete maker.Buckets[names[i]];
	}
};

function BucketConstructor(options){
	if( !options ){ options = {}; }
	
	this.prefix = options.prefix || '';
	this.suffix = options.suffix || '.bucket';
	this.unit   = options.unit   || 5000;              // default: 5sec(msec)
	this.spool  = options.spool  || '.';               // default: current directory
	this.dumper = options.dumper || default_dumper;
	this.writer = options.writer || default_writer;
	this.start  = options.start  || true;              // default: auto start
	this.log    = options.log    || default_log;
	
	this.cron_time = options.cron_time || '* * * * * *'; // default: check bucket to be written out every sec
	
	if( this.unit > DAY_UNIT ){ console.log("unit max is "+DAY_UNIT); return false; }
	
	this.Buckets = {};
	
	let self = this;
	
	this.job = new cronJob({
		cronTime : this.cron_time,
		onTick   : function(){ self.writer(self) },
		start    : false
	});
	
	if( this.start ){
		this.job.start()
	}
};

let Bucket = BucketConstructor.prototype;

Bucket.dayslotFor = function(timestamp){ // UTC msec
	let days = timestamp / DAY_UNIT;
	let day  = Math.floor(days); // days from epoch
	let slot = Math.ceil( (days - day) * DAY_UNIT / this.unit ); // units from 00:00
	return { day:day, slot:slot };
};

Bucket.put = function(msg){
	let now = Date.now();
	let dayslot = this.dayslotFor(now);
	let day  = dayslot.day;
	let slot = dayslot.slot;
	let name = day + '.' + slot;
	
	if( this.Buckets[name] ){
		this.Buckets[name].buffer.push(msg);
	}else{
		this.Buckets[name] = { buffer:[msg], cutoff: (day * DAY_UNIT + slot * this.unit) };
	}
};

Bucket.start = function(){
	this.job.start();
};

Bucket.stop = function(){
	this.job.stop();
};

Bucket.writeout = function(){
	this.writer(this);
};

module.exports = BucketConstructor;


