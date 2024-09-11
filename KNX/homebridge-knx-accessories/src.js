var net = require('net');
var queue = [];
let last_set = 0;
var client = new net.Socket();

setTimeout(() => {
client.connect(3671, 'localhost', function() {
	console.log('Connected to KNX-Manager');
});
},10000);

client.on('close', function() {
	console.log('KNX Manager is Offline');
    setTimeout(() => client.connect({ port: 3671, host: 'localhost' }), 5000);
 }); 

client.on('error', function(err) {
	console.log('Err connecting to KNX manager');
 });


function set(command){
var temp_time = time();
if((temp_time-last_set) > 100){
client.write(command);
last_set = temp_time;
}

else{
queue.push(command);
setTimeout(() => force_execute() , 500);
last_set = temp_time;
}
}

function time(){
const d = new Date();
return d.getTime();
}

function force_execute(){
for(var i=0;i<queue.length;i++){
setorder(queue[i],i);
}
queue = [];
}

function setorder(xx,i){
setTimeout(() => client.write(xx), i*50);
}



module.exports = { set };
