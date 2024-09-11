import dgram from 'dgram';
import { EventEmitter } from 'events';

export class MyEventEmitter extends EventEmitter {}
export const myEmitter = new MyEventEmitter();

const server = dgram.createSocket({ type: 'udp4', reuseAddr: true });

server_broadcast(3000);

function server_broadcast(port: number){
  server.on('error', (err) => {
    console.error(`Server error:\n${err.stack}`);
    server.close();
    reconnect(port);
  });
  server.on('message', (msg, rinfo) => {
    console.log(`Received message from ${rinfo.address}:${rinfo.port}: ${msg}`);
    try {
      const json_parse: any = JSON.parse(msg.toString());
      const rmacid = json_parse.header.rmacid;
      const bus = json_parse.header.bus.toString();
      const device_ = json_parse.periodicdata.devsts.data;
      for (let i=0; i<device_.length; i++){
        myEmitter.emit('Feedback'+rmacid+bus+device_[i].ad.toString(), msg);
      }
    } catch (e) {
       console.log('Error in data received');
    }

  });
  server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
  });
  server.bind(port, () => {
    server.setBroadcast(true);
  });

}

function reconnect(port: number) {
  server_broadcast(port);
}