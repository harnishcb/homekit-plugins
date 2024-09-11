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
var queue_17 = [];
var queue_18 = [];
var queue_19 = [];
var queue_20 = [];
var queue_21 = [];
var queue_22 = [];
var queue_23 = [];
var queue_24 = [];
var queue_25 = [];
var queue_26 = [];
var queue_27 = [];
var queue_28 = [];
var queue_29 = [];
var queue_30 = [];
var queue_31 = [];
var queue_32 = [];
var test_que = [queue_1, queue_2, queue_3, queue_4, queue_5,queue_6 ,queue_7 ,queue_8 ,queue_9 ,queue_10 ,queue_11 ,queue_12 ,queue_13 ,queue_14 ,queue_15 ,queue_16 ,queue_17 ,queue_18 ,queue_19 ,queue_20 ,queue_21 ,queue_22 ,queue_23 ,queue_24 ,queue_25 ,queue_26 ,queue_27 ,queue_28 ,queue_29 ,queue_30 ,queue_31 ,queue_32];

function set_data(data,ip,gen,serial,token){
if(test_que[gen].length == 0){
	test_que[gen].push(data);
	setTimeout(() => send_data(ip,gen,serial,token), 750);
}
else{
	test_que[gen].push(data); 
}
}

function send_data(ip,gen,serial,token){
const net = require('net');	
var client = net.Socket();	
	var temp_data = ["XX","XX"];
	var temp_val = [255,255];
	for(var i=0;i<test_que[gen].length; i++){			
		if(test_que[gen][i][0] == 'S'){
			temp_data[parseInt(test_que[gen][i][1])] = test_que[gen][i][2]+"X";
		}
		if(test_que[gen][i][0] == 'D'){
			temp_val[parseInt(test_que[gen][i][1])] = parseInt(test_que[gen][i].slice(2,));
		}		
	}
	var sent = {"cmd":"000","slave":serial,"token":token,"data":(temp_data.join()).replace(/,/g,""),"dimmer":temp_val};	
	console.log(JSON.stringify(sent));
    test_que[gen] = [];
client.connect(13002, ip, function() {
	console.log('Connected from outside');
	client.write(JSON.stringify(sent));
});
client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy();
});
client.on('close', function() {
	console.log('Connection closed');
});
}

module.exports = { set_data }