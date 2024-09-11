const fs = require('fs');
const csv = require('csv-parser');
var indices = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
var fan = [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false];
var last_time = [1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,];
function timestamp(ind){
	var d = new Date();
    if(d.getTime() - last_time[ind] > 1000){
		return true;
	}
	else {
		return false;
	}
}

function update(ind){
	var d = new Date();
	last_time[ind] = d.getTime();
}

module.exports = { timestamp , update }