var Service, Characteristic;

//******* Requirements ***************//
const indices = require("./arraycount");
const fs = require('fs');
const Net = require('net');


//**     Array to map each channel properties of Panel with Homekit accessories   **///
var type = [];
var devtype = ['switch','bulb','fan','curtain','scene','','','','','empty'];

//**     Array to store current status of Node ID of each Panel   **///
var Node = [];

//**     Array to store current status of discrete channels of Panel   **///
var state = [];
var value = [];

var d = new Date();
var last_set;

//**     Array to store curtain move time   **///
var time = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]


//**         function exports the platform to homebridge ***//
module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-digiluxclient", "digiluxclient", digilux);
}  
function digilux(log, config) 
{

//**         fetch required parameters from config.json  ***//	
  this.log = log;
  this.totalNode = config["Total_Node"];
  this.ep10 = config["10-ep"];
  this.ep9 = config["9-ep"];  
  this.ep8 = config["8-ep"];
  this.ep7 = config["7-ep"];
  this.ep4 = config["6-ep"];
  this.ep5 = config["5-ep"];
  this.ep4 = config["4-ep"];
  this.ep3 = config["3-ep"];
  this.ep2 = config["2-ep"];
  this.ip = config["ip"];
}



digilux.prototype.accessories = function(callback){
var result = [];

//*********     TCP Socket establish with the client (Zemote Server) ***//
this.client = new Net.Socket();
this.client.connect(8010, this.ip, function() {
	console.log('Connected');
	for(var i=1;i<=this.totalNode;i++){
	this.client.write("action_id=0&device_id="+String(i)+"&epvalue_id=255"+"0x0d0x0a");            // Fetch current status when the process restarted
	}
	last_set = d.getTime();
});

this.client.on('data', function(data) {
	
	
//***** Decode the data send by Digilux server and update it to respective accessories class sub function ***//	
	data = data.toString();
	console.log('Received: ' + data);
	if(data[0] == "{"){
	 data = JSON.parse(data.slice(data.lastIndexOf("{"),data.lastIndexOf("}")+1));
	 var pos = Node.indexOf(data.N.toString());
	 console.log("init: ", pos)
	 if(pos !== -1){       	 
	 for(var k=0;k<data.M;k++){      
        var dept = indices.arraycount(type,pos);	 
		console.log(dept,k);
		if(type[pos] !== 'empty'  && type[pos] !== 'scene'){
		  result[pos-dept].handleResponse(data.S[k], data.V[k]); 
		  console.log(pos-dept,pos,type[pos]);
		}
		else if(type[pos] == 'scene'){
		  result[pos-dept].handleResponse(data.S, data.V); 
		  k = data.M;
		  console.log(pos-dept,pos,type[pos]);
		}
	    	state[pos] = Boolean(data.S[k]);
	    	value[pos] = Math.ceil(data.V[k]);  
	    	pos=pos+1;		
	 }
	 }
	}
	
});
this.client.on('close', function() {
	console.log('Connection closed');
	this.client.connect(8010, this.ip, function() {
	console.log('Connected');
});
});
this.client.on('error', function(err) {
	console.log('Error-'+err);
	this.client.connect(8010, this.ip);
});



//*********   lauch the accessories after mapped with configuration metioned with config.json ***//


var devices = [digiluxswitch,digiluxbulb,digiluxfan,digiluxcurtain,dlscene];
 if(Array.isArray(this.ep10)){	 
		for(var i=0; i<this.ep10.length; i++){
		    for(var j=0; j<10; j++){
		  	result.push(new devices[this.ep10[i].ept[j]](this.ep10[i].node, this.client, j));
			Node.push(this.ep10[i].node);
			state.push(false);
			value.push(0);
			type.push(devtype[this.ep10[i].ept[j]]);
			}
 }
 }
  if(Array.isArray(this.ep9)){	 
		for(var i=0; i<this.ep9.length; i++){
		    for(var j=0; j<9; j++){
		  	result.push(new devices[this.ep9[i].ept[j]](this.ep9[i].node, this.client, j));
			Node.push(this.ep9[i].node);
			state.push(false);
			value.push(0);
			type.push(devtype[this.ep9[i].ept[j]]);
			}
 }
 }
 if(Array.isArray(this.ep8)){	 
		for(var i=0; i<this.ep8.length; i++){
		    for(var j=0; j<8; j++){
		       if(this.ep8[i].ept[j] !== "9"){
		  	  	result.push(new devices[this.ep8[i].ept[j]](this.ep8[i].node, this.client, j));
			   }
		  		Node.push(this.ep8[i].node);
		  		state.push(false);
		  		value.push(0);
		  		type.push(devtype[this.ep8[i].ept[j]]);
			   }
			}
 }
 }
  if(Array.isArray(this.ep7)){	 
		for(var i=0; i<this.ep7.length; i++){
		    for(var j=0; j<7; j++){
				if(this.ep7[i].ept[j] !== "9"){
	  		  	result.push(new devices[this.ep7[i].ept[j]](this.ep7[i].node, this.client, j));
				}
				Node.push(this.ep7[i].node);
	  			state.push(false);
	  			value.push(0);
	  			type.push(devtype[this.ep7[i].ept[j]]);				
			}
 }
 }
  if(Array.isArray(this.ep6)){	 
		for(var i=0; i<this.ep6.length; i++){
		    for(var j=0; j<6; j++){
			if(this.ep6[i].ept[j] !== "9"){
		  	result.push(new devices[this.ep6[i].ept[j]](this.ep6[i].node, this.client, j));
			}
			Node.push(this.ep6[i].node);
			state.push(false);
			value.push(0);
			type.push(devtype[this.ep6[i].ept[j]]);
			}
 }
 }
 if(Array.isArray(this.ep5)){	 
		for(var i=0; i<this.ep5.length; i++){
		    for(var j=0; j<5; j++){
		  	result.push(new devices[this.ep5[i].ept[j]](this.ep5[i].node, this.client, j));
			Node.push(this.ep5[i].node);
			state.push(false);
			value.push(0);
			type.push(devtype[this.ep5[i].ept[j]]);
			}
 }
 }
  if(Array.isArray(this.ep4)){	 
		for(var i=0; i<this.ep4.length; i++){
		    for(var j=0; j<4; j++){
		       if(this.ep4[i].ept[j] !== "9"){				
		  	  	result.push(new devices[this.ep4[i].ept[j]](this.ep4[i].node, this.client, j));
				}
				state.push(false);
		  		value.push(0);
		  		Node.push(this.ep4[i].node);
		  		type.push(devtype[this.ep4[i].ept[j]]);			   
			}
 }
 }
   if(Array.isArray(this.ep3)){	 
		for(var i=0; i<this.ep3.length; i++){
		    for(var j=0; j<3; j++){
		  	result.push(new devices[this.ep3[i].ept[j]](this.ep3[i].node, this.client, j));
			Node.push(this.ep3[i].node);
			state.push(false);
			value.push(0);
			type.push(devtype[this.ep3[i].ept[j]]);
			}
 }
 }
 if(Array.isArray(this.ep2)){	 
		for(var i=0; i<this.ep2.length; i++){
		    for(var j=0; j<2; j++){
		  	result.push(new devices[this.ep2[i].ept[j]](this.ep2[i].node, this.client, j));
			Node.push(this.ep2[i].node);
			state.push(false);
			value.push(0);
			type.push(devtype[this.ep2[i].ept[j]]);
			}
 }
 }
 console.log(result.length);
 callback(result)                  /// Callback to publish accessories
}
    

class digiluxswitch{
	constructor(node, client, id){
	this.node = node;
	this.client = client; 
    this.id = id.toString();
	this.name= "Switch-"+this.node+this.id;
	this.digiluxswitch = new Service.Switch(this.name);
	}	
	
	//**       Trigger and feedback function related to each property of the Accessries // 		
	setdigiluxswt(stt,callback){ 
 		var set = 'action_id='+(2-Number(stt)).toString()+'&device_id='+this.node+'&epvalue_id='+this.id+' 0x0d0x0a';
                if(d.getTime()-last_set < 500){
		setTimeout(() => this.client.write(set), Math.random()*1000); 	
                last_set = d.getTime();
		}
		else{
   		 this.client.write(set);  
                 last_set = d.getTime();
		}
		last_set = d.getTime();
 	     callback(null);		
    }	
	getdigiluxswt(callback){    	
	 callback(null, state[parseInt(Node.indexOf(this.node))+parseInt(this.id)]);	
	}
	
	 getServices(){
      /// Define the infoservice of the homekit accesies //
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "Digilux-Server")
         .setCharacteristic(Characteristic.SerialNumber, "CB-"+this.node+"00000"+this.id);

		/// Define the Activity Service  of the homekit accesies //	 	 
      this.digiluxswitch
         .getCharacteristic(Characteristic.On).on('get', this.getdigiluxswt.bind(this)).on('set', this.setdigiluxswt.bind(this)); 
	 return [infoService,this.digiluxswitch];
    }
	
	
	handleResponse(cs,cv){
		setTimeout(() => this.digiluxswitch.getCharacteristic(Characteristic.On).updateValue(state[parseInt(Node.indexOf(this.node))+parseInt(this.id)], null), 1500);
	}
}


//**************** Comments and Parameters remains the same ***/////////////////////////////

class digiluxbulb{
	constructor(node, client, id){
	this.node = node;
	this.client = client; 
    this.id = id.toString();
	this.name= "Dim-"+this.node+this.id;
    this.digiluxbulb = new Service.Lightbulb(this.name);
	}
   setdigiluxbulb(stt,callback){
	     var set = 'action_id='+(2-Number(stt)).toString()+'&device_id='+this.node+'&epvalue_id='+this.id+' 0x0d0x0a';
         if(d.getTime()-last_set < 500){
		 setTimeout(() => this.client.write(set), this.id*150); 	
		 last_set = d.getTime(); 	
		}
		else{
   		 this.client.write(set);  
		 last_set = d.getTime(); 
		}
		last_set = d.getTime(); 
 	     callback(null);	
    }
     setdigiluxbulbval(stt,callback){
		 if(stt !== 0){
		   var set = 'action_id=4&device_id='+this.node+'&epvalue_id='+this.id+'&currentAnalogValue='+stt.toString()+' 0x0d0x0a';
                   this.client.write(set); 	 
		 }
		 else{
		   var set = 'action_id=2&device_id='+this.node+'&epvalue_id='+this.id+' 0x0d0x0a';
                  this.client.write(set);  
		 }
         callback(null);
	} 
	 
	getdigiluxbulb(callback){
	  callback(null, state[parseInt(Node.indexOf(this.node))+parseInt(this.id)]);	
	}
	
	getdigiluxbulbval(callback){
	  callback(null, value[parseInt(Node.indexOf(this.node))+parseInt(this.id)]);	
	}
	
	
	getServices(){
 
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "Digilux-Server")
         .setCharacteristic(Characteristic.SerialNumber, "CB-"+this.node+"00000"+this.id);
      this.digiluxbulb
         .getCharacteristic(Characteristic.On).on('get', this.getdigiluxbulb.bind(this)).on('set', this.setdigiluxbulb.bind(this));
     this.digiluxbulb
        .getCharacteristic(Characteristic.Brightness).on('get', this.getdigiluxbulbval.bind(this)).on('set', this.setdigiluxbulbval.bind(this))
     	 .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: 10
         });	 
	 return [infoService,this.digiluxbulb];
    }	
		handleResponse(cs,cv){
          this.digiluxbulb.getCharacteristic(Characteristic.On).updateValue(cs, null);
		  this.digiluxbulb.getCharacteristic(Characteristic.Brightness).updateValue(cv, null);
    }


}



class digiluxfan{
	constructor(node, client, id){
	this.node = node;
	this.client = client; 
    this.id = id.toString();
	this.name= "Fan-"+this.node+this.id;
    this.digiluxfan  = new Service.Fan(this.name);	
	}
	
	 setdigiluxfan(stt,callback){
         var set = 'action_id='+(2-Number(stt)).toString()+'&device_id='+this.node+'&epvalue_id='+this.id+' 0x0d0x0a';
         this.client.write(set);  
 	     callback(null);	
    }
     setdigiluxfanval(stt,callback){
	     var set = 'action_id=4&device_id='+this.node+'&epvalue_id='+this.id+'&currentAnalogValue='+stt.toString()+' 0x0d0x0a';
         this.client.write(set);  
         callback(null);
	} 
	 
	getdigiluxfan(callback){
		 callback(null, state[parseInt(Node.indexOf(this.node))+parseInt(this.id)]);	
	}
	
	getdigiluxfanval(callback){
		  callback(null, Math.min(value[parseInt(Node.indexOf(this.node))+parseInt(this.id)]*25,100));	
	}
	
	getServices(){
 
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "Digilux-Server")
         .setCharacteristic(Characteristic.SerialNumber, "CB-"+this.node+"00000"+this.id);
      this.digiluxfan
         .getCharacteristic(Characteristic.On).on('get', this.getdigiluxfan.bind(this)).on('set', this.setdigiluxfan.bind(this));
     this.digiluxfan
        .getCharacteristic(Characteristic.RotationSpeed).on('get', this.getdigiluxfanval.bind(this)).on('set', this.setdigiluxfanval.bind(this))
		 .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: 25
         });
     		 
	 return [infoService,this.digiluxfan];
    }
	
	handleResponse(cs,cv){
      this.digiluxfan.getCharacteristic(Characteristic.On).updateValue(cs, null);
	  this.digiluxfan.getCharacteristic(Characteristic.RotationSpeed).updateValue(Math.min(cv*25,100), null);
    }
}


class digiluxcurtain{
	constructor(node, client, id){
	this.node = node;
	this.client = client; 
    this.id = id.toString();
	this.name= "Curtain-"+this.node+this.id;
    this.digiluxcurtain  = new Service.WindowCovering(this.name);	
	}

     setdigiluxcurtainval(stt,callback){
	    var set = 'action_id='+(11-stt).toString()+'&device_id='+this.node+'&epvalue_id='+this.id+' 0x0d0x0a';
        this.client.write(set);  
		setTimeout(() => this.client.write(set.slice(0,9)+'12'+set.slice(12,)) ,Math.round(stt*(time[his.node+this.id]/10)));
        callback(null);
	} 
	 
	getdigiluxcurtain(callback){
	     callback(null, 0);
	}
	
	getdigiluxcurtainval(callback){
		 callback(null, 0);
	}	
	 getdigiluxcurtainpos(callback){
     	 callback(null, 0);
    }	
	getServices(){
 
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "Digilux-Server")
         .setCharacteristic(Characteristic.SerialNumber, "CB-"+this.node+"00000"+this.id);
      this.digiluxcurtain
         .getCharacteristic(Characteristic.CurrentPosition).on('get', this.getdigiluxcurtain.bind(this))
		 .setProps({
           minValue: 0,
           maxValue: 10,
           minStep: 1
         });
     this.digiluxcurtain
        .getCharacteristic(Characteristic.TargetPosition).on('get', this.getdigiluxcurtainval.bind(this)).on('set', this.setdigiluxcurtainval.bind(this))
		 .setProps({
           minValue: 0,
           maxValue: 10,
           minStep: 1
         });
      this.digiluxcurtain
         .getCharacteristic(Characteristic.PositionState).on('get', this.getdigiluxcurtainpos.bind(this))
		 .setProps({
           minValue: 2,
           maxValue: 2,
           minStep: 1
         });		 
	 return [infoService,this.digiluxcurtain];
    }
	
	handleResponse(cs){
          this.digiluxcurtain.getCharacteristic(Characteristic.CurrentPosition).updateValue(cs, null);
    }
}



class dlscene{
   constructor(node ,client ,id){
	this.node = node;
        this.client = client;
    this.id = id.toString();
	this.name =  "Scene Switch-"+this.id;
    this.dlscene = new Service.StatelessProgrammableSwitch(this.name,this.name);
	this.dlscene2 = new Service.StatelessProgrammableSwitch(this.name+"2",this.name+"2");
 	this.dlscene3 = new Service.StatelessProgrammableSwitch(this.name+"3",this.name+"3");
 	this.dlscene4 = new Service.StatelessProgrammableSwitch(this.name+"4",this.name+"4");
   }
   getdlsceneevent(callback){
	   callback(null, 0);
   }
   getdlsceneevent2(callback){
	   callback(null, 0);
   }
   getdlsceneevent3(callback){
	   callback(null, 0);
   }
   getdlsceneevent4(callback){
	   callback(null, 0);
   }
   getServices(){   	 
    var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "Digilux-Server")
         .setCharacteristic(Characteristic.SerialNumber, "CB-"+this.node+"00000"+this.id);
    this.dlscene
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get', this.getdlsceneevent.bind(this,this.id)) 
         .setProps({ maxValue: 0 });	
    this.dlscene
	    .getCharacteristic(Characteristic.ServiceLabelIndex).setValue(1);
	
	this.dlscene2
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get', this.getdlsceneevent2.bind(this,this.id)) 
         .setProps({ maxValue: 0 });	
    this.dlscene2
	    .getCharacteristic(Characteristic.ServiceLabelIndex).setValue(2);
	
	this.dlscene3
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get', this.getdlsceneevent3.bind(this,this.id)) 
         .setProps({ maxValue: 0 });	
     this.dlscene3
	    .getCharacteristic(Characteristic.ServiceLabelIndex).setValue(3);

    this.dlscene4
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get', this.getdlsceneevent4.bind(this,this.id)) 
         .setProps({ maxValue: 0 });	
     this.dlscene4
	    .getCharacteristic(Characteristic.ServiceLabelIndex).setValue(4);
		
	return [infoService, this.dlscene, this.dlscene2, this.dlscene3, this.dlscene4];
    }
	
	
	handleresponse(update,junk){	 
	    console.log(update);
		update = update.indexOf("1")
		switch(update%4){
		  case 0:
		    this.dlscene.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0, null);
		  break;
		 
          case 1:
		    this.dlscene2.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0, null);
		  break;
        
   		 case 2:
		    this.dlscene3.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0, null);
		  break;	

         case 3:
		    this.dlscene4.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0, null);
		  break;		  
		}
	}

}