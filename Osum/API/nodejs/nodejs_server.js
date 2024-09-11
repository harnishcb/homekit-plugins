import * as http from "http";
import * as request from "request";

interface SLBusObject {
    slnode: any;
    encPkt?: any;
}

let slbusObj: SLBusObject = {};
let devResponse: string = "";

const hostname: string = "0.0.0.0";
const port: number = 1400;	/* http port of server */

const server: http.Server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
	let dlm_token: string = "";
	let uuid: string = "";
	let cmd: any = "";
	slbusObj.slnode = require('./slbus.js');

	req.on("data", function (rdata: Buffer) {
		let data = JSON.parse(rdata.toString());
		dlm_token = data.dlm_access_token;
		uuid = data.uuid;
		cmd = data.cmd;
		let ip_address: string = data.ip_address;
		let cmd_data: string = JSON.stringify(cmd);
		slbusObj.slnode.getEncPkt(cmd_data, uuid, function (returnValue: any) {
			let response = JSON.parse(returnValue);
			slbusObj.encPkt = response;
			let cmd = JSON.parse(String(response.sldevObj)).cmd;
			let sl_obj: any = {};
			sl_obj[dlm_token] = cmd;
			sl_obj["uuid"] = uuid;

			request({
				method: 'POST',
				url: "http://" + ip_address + "/slbus/dlmcmd/",
				headers: {
					'content-type': 'application/json'
				},
				json: sl_obj,
				rejectUnauthorized: false
			}, function (err, slresp, body) {
				if (!err) {
					if (slresp.statusCode == 200) {
						let data = slresp.body;
						let decPkt: any = {};
						decPkt = data;
						let islandOutObj = slbusObj.encPkt.islandOutObj;
						let sldevObj = slbusObj.encPkt.sldevObj;
						let decPkt_data: string = JSON.stringify(decPkt);
						let ret = slbusObj.slnode.getDecPkt(sldevObj, islandOutObj,
							decPkt_data, uuid, function (returnValue: any) {
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
