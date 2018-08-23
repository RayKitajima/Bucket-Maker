
# bucket-maker

To reduce I/O cost, bucket-maker makes bucket of sliced timline for each *unit* you requested.  
Name of the bucket is defined by its **day** and **slot**.

* **day** is a number of days from unix epoch
* **slot** is a number of unit from 00:00
* *unit* is defined by you

This is calculated like as follows:

``` 
unit = 5000;                                                // msec
days = Date.now() / (60*60*24*1000);                        // 17764.309366608795
day  = Math.floor(days);                                    // 17764
slot = Math.ceil( (days - day) * (60*60*24*1000) / unit );  // 5346
``` 

## Demo

``` 
$ git clone https://github.com/RayKitajima/Bucket-Maker.git
$ cd Bucket-Maker

$ node demo/timestamp.js
``` 

`demo/timestamp.js` write out timestamp every sec into the bucket.  
The bucket is made for every five sec.  
So the bucket contains five entries in it.

### At a grance

``` 
// get 5sec(msec) bucket maker
let bucket = require('bucket-maker').createBucket({
	unit: 5000
});

// put timestamp every sec
setInterval(function(){
	bucket.put(Date.now());
},1000);

// will write out
$ ls 
17764.4761.bucket  17764.4762.bucket

// will contain
$ cat 17764.4762.bucket
1534833405881
1534833406883
1534833407888
1534833408893
1534833409897
``` 

## Options

Internally bucket is an array. And it will periodically *dump* and *write* them by `dumper` and `writer`.

| name      | what is                                                             |
|:----------|:--------------------------------------------------------------------|
| prefix    | prefix for output bucket name                                       | 
| suffix    | suffix for output bucket name. default \<suffix\> is '.bucket'      | 
| unit      | bucket unit as msec                                                 | 
| spool     | where to write out bucket file                                      | 
| dumper    | how to dump elements in the bucket. <br>by default assume them as stirng and join() them | 
| writer    | how to write out dumped object. <br>by default write out to file named as \<prefix\>\<day\>.\<slot\>\<suffix\>. | 
| start     | whether to start writing at created                                 | 
| cron_time | frequency of checking bucket                                        | 
| log       | how to system log                                                   |

## Practice

``` 
const pid  = process.pid;
const host = os.hostname();
const prefix = pid + '.' + host + '.';

let bucket = require('bucket-maker').createBucket({
	prefix : prefix,
	suffix : '.bucket',
	unit   : 5000,
	spool  : '/path/to/buckets',
	dumper : function(items){ return items.map( x => JSON.stringify(x) ).join('\n') },
});

setInterval(function(){
	bucket.put(os.loadavg());
},1000);
```

Reporting load avarage every sec. And make 5sec bucket.

``` 
$ ls 
4825.localhost.17764.4761.bucket  4825.localhost.17764.4762.bucket
``` 

## More reducing I/O cost with redis

``` 
const client = require('redis').createClient();

const writer = function(maker){
	let names = Object.keys(maker.Buckets);
	let now = Date.now();
	for( let i=0; i<names.length; i++ ){
		if( maker.Buckets[names[i]].cutoff > now ){ continue; }   // skip: still putting into the bucket
		let dump = maker.dumper(maker.Buckets[names[i]].buffer);
		let key  = name[i];                                       // wait:17764.4762.bucket
		client.set(key,dump,function(err,res){
			if( err ){
				maker.log(err);
			}else{
				delete maker.Buckets[names[i]];
			}
		});
	}
};

let bucket = require('bucket-maker').createBucket({
	prefix : 'wait:',
	unit   : 5000,
	dumper : function(items){ return items.map( x => JSON.stringify(x) ).join('\n') },
	writer : writer,
});

setInterval(function(){
	bucket.put(os.loadavg());
},1000);
```

This writes out loadavg report into redis.

```
const client = require('redis').createClient();

const drain = function(){
	client.keys('wait:*',function(err,keys){
		for( let i=0; i<keys.length; i++ ){
			client.get(keys[i],function(err,content){
				let bucket_name = keys[i].split(':')[1]; // 17764.4762.bucket
				fs.writeFileSync(bucket_name,content);
				client.del(keys[i]);
			});
		}
	});
};

setInterval(drain,5000);
```

This drains bucket to the file system.

If you would like to implement your own writer, you have to know about internal code, and should write several idiom to define what to write out.


## License

MIT

