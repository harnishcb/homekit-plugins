var net = require('net');
var queue_1 = [];

function set(data,ip,gen){
queue_1.push(data);
var client = new net.Socket();
setTimeout(() => {
if(queue_1.length != 0){
var set = ['a','a','a','a','a','a','a','a','a','a','a'];
var ix =  queue_1[0].indexOf("#%")+2;
var temp_1 = queue_1[0].slice(0,ix);
for(var i=0;i<queue_1.length;i++){
	for(var j=0;j<11;j++){
       if(queue_1[i][j+ix] !== 'a'){
		   set[j] = queue_1[i][j+ix];
	   }	 
	}
}

queue_1 = [];
var set_calue = temp_1+ String(set).replace(/,/g, '');	
console.log(ip, set_calue);
client.connect(50505,ip,function() {
	client.write(set_calue);
});
client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy();
});
client.on('close', function() {
	console.log('Connection closed');
});
client.on('error', function(err) {
	console.log('Error');
});
}
}, 750);
}

module.exports = { set }