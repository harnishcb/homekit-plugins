import * as http from 'http';
import * as request from 'request';

interface SlbusObj {
  slnode?: any;
  encPkt?: any;
}

let slbusObj: SlbusObj = {};
let devResponse = "";

const hostname = "localhost";
const port = 35016; /* http port of server */

const server = http.createServer((req, res) => {
  let dlm_token = "";
  let uuid = "";
  let cmd = "";
  let ip_address = "";
  slbusObj.slnode = require('../slbus.js');
  req.on("data", (rdata: Buffer) => {
    const data = JSON.parse(rdata.toString());
    dlm_token = data.dlm_access_token;
    uuid = data.uuid;
    cmd = data.cmd;
    ip_address = data.ip_address;
    const cmd_data = JSON.stringify(cmd);

    slbusObj.slnode.getEncPkt(cmd_data, uuid, (returnValue: string) => {
      const response = JSON.parse(returnValue);
      slbusObj.encPkt = response;
      const cmd = JSON.parse(String(response.sldevObj)).cmd;
      const sl_obj: Record<string, any> = {};
      sl_obj[dlm_token] = cmd;
      sl_obj["uuid"] = uuid;

      request({
        method: 'POST',
        url: `http://${ip_address}/slbus/dlmcmd/`,
        headers: {
          'content-type': 'application/json'
        },
        json: sl_obj,
        rejectUnauthorized: false
      }, (err, slresp, body) => {
        if (!err) {
          if (slresp.statusCode === 200) {
            const data = slresp.body;
            const decPkt = data;
            const islandOutObj = slbusObj.encPkt.islandOutObj;
            const sldevObj = slbusObj.encPkt.sldevObj;
            const decPkt_data = JSON.stringify(decPkt);

            slbusObj.slnode.getDecPkt(sldevObj, islandOutObj, decPkt_data, uuid, (returnValue: string) => {
              devResponse = JSON.stringify(JSON.parse(returnValue));
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              return res.end(devResponse);
            });
          } else {
            console.log("Error: statusCode code is: " + slresp.statusCode);
          }
        } else {
          console.log("Error is: " + err);
        }
      });
    });
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
