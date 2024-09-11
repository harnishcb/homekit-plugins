/* eslint-disable no-console */
/**
 * *This file is for testing purpose only.
 */
import { createConnection } from "net";

const client = createConnection({ port: 4096, host: "192.168.1.224" });

client.write("{\"get\":[{\"dp_id\":100}]}\r\n");

client.on("data", (stream) => {
    console.log(stream.toString());
});

client.on("close", () => {
    console.log("Connection Closed");
});

import dns from "node:dns";

dns.lookupService("192.168.1.1", 22, (err, hostname, service) => {
    console.log(hostname, service);
});