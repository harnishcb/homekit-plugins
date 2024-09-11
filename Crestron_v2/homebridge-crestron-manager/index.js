var Service, Characteristic;
const net = require('net');

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-crestron-manager", "crestron-manager", crestron);
}

function crestron(log, config)
{
   //this.port = config["Server_Port_no"];
   this.log = log;
}

crestron.prototype.accessories = function(callback){

var log = this.log;
let active_socket = [];
let plugin_socket = [];
let plugin_socket_type = [];
var results = [];
let command_list = [];
let fb_fan_range = [];
let fb_dimmer_range = [];
let fb_curtain_range = [];
let fb_cct_range = [];
let fb_switch_range = [];
let fb_ac_range = [];

setTimeout(() => {
  const server = net.createServer((socket) => {
    log.info('Crestron server connected to CueDesk');
    active_socket.push(socket);
    fan_parameter();
    ac_parameters();
    fb_crestron();
    socket.on('data', (data) => {
      data = data.toString();
      log.info('Data received from Crestron Client:', data);
      for (var i=0; i<plugin_socket.length; ) {
        if (data.indexOf(plugin_socket_type[i]) !== -1){
          plugin_socket[i].write(data);
          i = plugin_socket.length;
        }
        i++;
      }
    });

    socket.on('end', () => {
      log.warn('Client disconnected');
      const index_active = active_socket.indexOf(socket);
      if (index_active !== -1) {
          active_socket.splice(index_active, 1);
      }
    });

    socket.on('error', (err) => {
      log.error('Socket error:', err);
    });
  });

  server.listen(36500, () => {
      log.info(`Server listening on port 36500`);
  });

  server.on('error', (err) => {
      log.error('Server error:', err);
  });

}, 10000);

//----------------------------------------------------------//

const server_plugin = net.createServer((socket) => {
  log.info('Plugin Client connected');
  plugin_socket.push(socket);
  plugin_socket_type.push('Null');
  socket.on('data', (data) => {
    data = data.toString();
    log.info('Data received from Plugin Client:', data);
    if (data.indexOf('FanID') !== -1){
      fb_fan_range = data.split(':')[1].split(',');
      plugin_socket_type[plugin_socket.indexOf(socket)] = 'Fan';
    }
    else if (data.indexOf('CurtainID') !== -1){
      fb_curtain_range = data.split(':')[1].split(',');
      plugin_socket_type[plugin_socket.indexOf(socket)] = 'Curtain';

    }
    else if (data.indexOf('DimmerID') !== -1){
      fb_dimmer_range = data.split(':')[1].split(',');
      plugin_socket_type[plugin_socket.indexOf(socket)] = 'Lightbulb';
    }
    else if (data.indexOf('SwitchID') !== -1){
      fb_switch_range = data.split(':')[1].split(',');
      plugin_socket_type[plugin_socket.indexOf(socket)] = 'Switch';
    }
    else if (data.indexOf('CCTID') !== -1){
      fb_cct_range = data.split(':')[1].split(',');
      plugin_socket_type[plugin_socket.indexOf(socket)] = 'CCT';
    }
    else if (data.indexOf('ACID') !== -1){
      fb_ac_range = data.split(':')[1].split(',');
      plugin_socket_type[plugin_socket.indexOf(socket)] = 'AC';
      ac_parameters();
    }
    else {
          if (command_list.length == 0){
            setTimeout(() => trigger_data(), 500);
          }
          command_list.push(data);
    }
  });

  socket.on('end', () => {
    log.warn('Client disconnected');
    const index_plugin = plugin_socket.indexOf(socket);
    if (index_plugin !== -1){
        plugin_socket.splice(index_plugin,1);
        plugin_socket_type.splice(index_plugin,1);
    }
  });

  socket.on('error', (err) => {
    log.error('Socket error:', err);
  });
});

server_plugin.listen(36600, () => {
    log.info(`Server listening on port 36600`);
});

server_plugin.on('error', (err) => {
    log.error('Server error:', err);
});
//-------------------------------------------------------------//
async function trigger_data(){
  for (var i=0;i<command_list.length;i++) {
    for (var j=0; j<active_socket.length; j++) {
      active_socket[j].write(command_list[i]+'\n');
  }
  await delay(100)
  }
  command_list=[];
}
/*
Feedback for Accessory Parameter
*/
async function fan_parameter(){
  await delay(500);
  for (let i = 0; i < fb_fan_range.length; i++) {
    let data_to_send = 'Fan:'+fb_fan_range[i]+':getFanMaxStep'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
    await delay(100);
  }
}

async function ac_parameters(){
  for (let i = 0; i < fb_ac_range.length; i++) {
    let data_to_send = 'AC:'+fb_ac_range[i]+':getTempRange'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
      await delay(100);
  }
}
async function fb_crestron() {




/*
Feedback for Accessory state
*/

  for (let i = 0; i < fb_dimmer_range.length; i++) {
    let data_to_send = 'Lightbulb:'+fb_dimmer_range[i]+':getPowerLevel'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
    await delay(100);
  }
  for (let i = 0; i < fb_switch_range.length; i++) {
    let data_to_send = 'Switch:'+fb_switch_range[i]+':getPowerState'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
    await delay(100);
  }
  for (let i = 0; i < fb_cct_range.length; i++) {
    let data_to_send = 'LightCCT:'+fb_cct_range[i]+':getPowerLevel'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
    await delay(100);
  }
  for (let i = 0; i < fb_curtain_range.length; i++) {
    let data_to_send = 'Curtain:'+fb_curtain_range[i]+':getTargetState'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
    await delay(100);
  }
  for (let i = 0; i < fb_fan_range.length; i++) {
    let data_to_send = 'Fan:'+fb_fan_range[i]+':getSpeedLevel'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
    await delay(100);
  }
  for (let i = 0; i < fb_ac_range.length; i++) {
    let data_to_send = 'AC:'+fb_ac_range[i]+':getPowerState'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
    await delay(100);
    data_to_send = 'AC:'+fb_ac_range[i]+':getTemperature'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
    await delay(100);
  }
  for (let i = 0; i < fb_cct_range.length; i++) {
    let data_to_send = 'LightCCT:'+fb_cct_range[i]+':getColortemperature'+'\r';
    log.info('Sending data to crestron server:', data_to_send);
    for (let j = 0; j < active_socket.length; j++) {
      active_socket[j].write(data_to_send);
    }
    await delay(100);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


//-----------------------------------------------------------//
callback(results)
}