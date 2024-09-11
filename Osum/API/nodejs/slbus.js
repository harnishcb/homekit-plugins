var path = require("path");
var java = require("java");
var fs = require("fs");

var fpath = process.cwd();
var version = fs.readFileSync(fpath + "/../version.txt").toString().replace(/[\n\r]/g, '');;

libname="../java/libs/lib-slbus-comm-"+version+".jar";

java.classpath.push(path.resolve(__dirname, '../common/json-20140107.jar'));
java.classpath.push(path.resolve(__dirname,libname));

var nwCom = java.import('com.main.NetworkCommunication');

var list = java.newInstanceSync('com.main.BusCom', nwCom);

list.setCid("1234");
list.setParam1("slbus");

module.exports = {
	getEncPkt: function (jsonObj, uuid, callback) {
		list.setUuid(uuid);
		list.Command(jsonObj, function(err, results) {
			if(err) {
				console.error(err);
				callback(err);
				return false;
			}
			callback(results);
		});
		return true;
	},

	getDecPkt: function (sldevObj, islandOutObj, pkt, uuid, callback) {
		list.parsePacket(sldevObj, islandOutObj, pkt, function(err, results) {
			if(err) {
				console.error(err);
				callback(err);
				return false;
			}
			callback(results);
		});
		return true;
	},

	getLibVer: function (callback) {
		list.getLibVersion(function(err, results) {
			if(err) {
				console.error(err);
				callback(err);
				return false;
			}
			callback(results);
		});
		return true;
	}
}
