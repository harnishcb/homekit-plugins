const Net = require("net");
var client = new Net.Socket();
 
function create(ip,port){
   client.connect(port,ip);
   client.on('data', function(rec){        
	console.log(rec.toString());	
    return rec.toString();
    });
}
 
client.on('timeout', () => {
  create(ip,port)
});
   
client.on('error', (err) => {
  create(ip,port) 
}); 

function write(data){
	client.write(ir);	
}

module.exports = { create, write };