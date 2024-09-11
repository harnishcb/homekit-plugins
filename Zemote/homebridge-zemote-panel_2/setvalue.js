var net = require('net');
var old_data = ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxx"];
var execute = [1,1,1,1,1,1,1,1,1,1];
var last_execute = [0,0,0,0,0,0,0,0,0,0];

var queue_1 = [];
var queue_2 = [];
var queue_3 = [];
var queue_4 = [];
var queue_5 = [];
var queue_6 = [];
var queue_7 = [];
var queue_8 = [];
var queue_9 = [];
var queue_10 = [];
var queue_11 = [];
var queue_12 = [];
var queue_13 = [];
var queue_14 = [];
var queue_15 = [];
var queue_16 = [];

var test_que = [queue_1, queue_2, queue_3, queue_4, queue_5, queue_6, queue_7, queue_8, queue_9, queue_10, queue_11, queue_12, queue_13, queue_14, queue_15, queue_16];

var test_que = [queue_1, queue_2, queue_3, queue_4, queue_5];

function set(data,ip,gen){
test_que[gen].push(data);
var client = new net.Socket();
setTimeout(() => {
//console.log(test_que[gen]);
if(test_que[gen].length != 0){
var set = ['a','a'];
var ix =  test_que[gen][0].indexOf("#%")+2;
var temp_1 = test_que[gen][0].slice(0,ix);
for(var i=0;i<test_que[gen].length;i++){
//var temp_array = test_que[gen][i] 
	for(var j=0;j<2;j++){
	   console.log('j length-',test_que[gen][i][j+ix]);
	   //console.log(set);
       if(test_que[gen][i][j+ix] !== 'a'){
		   set[j] = test_que[gen][i][j+ix];
		//   console.log(test_que[gen][i][j+ix]);
	   }	 
	}
}
	

test_que[gen] = [];
var set_calue = temp_1+ String(set).replace(/,/g, '');	
console.log(set_calue);
client.connect(50505,ip , function() {
	console.log('Connected from outside');
	client.write(set_calue);
});
client.on('data', function(data) {
	console.log('Received during trigger: ' + data);
	client.destroy();
});
client.on('close', function() {
	console.log('Connection closed');
});
client.on('error', function(err) {
	console.log('Error');
});

}
}, 500);
}


module.exports = { set }
