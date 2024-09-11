import * as path from 'path';
import java from 'java';

const version = '1.1.7';
const libname = `.../Javalib/lib-slbus-comm-${version}.jar`;

java.classpath.push(path.resolve(__dirname, '.../Javalib/json-20140107.jar'));
java.classpath.push(path.resolve(__dirname, libname));

const nwCom = java.import('com.main.NetworkCommunication');
const list = java.newInstanceSync('com.main.BusCom', nwCom);

list.setCid("1234");
list.setParam1("slbus");

interface Callback<T = any> {
  (err: any, result?: T): void;
}

const getEncPkt = (jsonObj: string, uuid: string, callback: Callback): boolean => {
  list.setUuid(uuid);
  list.Command(jsonObj, (err: any, results: any) => {
    if (err) {
      console.error(err);
      callback(err);
      return false;
    }
    callback(null, results);
  });
  return true;
};

const getDecPkt = (sldevObj: string, islandOutObj: string, pkt: string, uuid: string, callback: Callback): boolean => {
  list.parsePacket(sldevObj, islandOutObj, pkt, (err: any, results: any) => {
    if (err) {
      console.error(err);
      callback(err);
      return false;
    }
    callback(null, results);
  });
  return true;
};

const getLibVer = (callback: Callback): boolean => {
  list.getLibVersion((err: any, results: any) => {
    if (err) {
      console.error(err);
      callback(err);
      return false;
    }
    callback(null, results);
  });
  return true;
};

export { getEncPkt, getDecPkt, getLibVer };
