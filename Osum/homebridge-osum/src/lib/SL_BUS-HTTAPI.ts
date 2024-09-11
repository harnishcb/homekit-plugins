import axios from 'axios';
const cloud_url = 'https://oath2.vadactro.org.in/slbus/api';
const local_url = 'http://localhost:35016/'

const headers = {
  'Content-Type': 'application/json',
};

class SLBusAPI {
  private tokenInfo: {
    access_token: string;
    refresh_token: string;
    expire: number;
  };

  // private dlm_access_token:  string;

  private Device_List: any[];
  private dlm_access_token: string;
  constructor(
    private dlm_user_email: string,
    private dlm_user_password: string,
    private assignee_details: string,
    private username: string,
    private password: string,
    private log: any
  ) {

    this.tokenInfo = {
      access_token: '',
      refresh_token: '',
      expire: 0,
    };

    this.dlm_access_token = '';

    this.Device_List = [];
  }

  /**
   *
   * Refresh Token after interval
  */

  private async set_refresh_Interval(interval: number) {

    setInterval(() => {
      this.log(`Refreshing the device lease token`);
      this._refreshAccessTokenIfNeed();
      this._GrantAccess();
    }, interval);

  }

  private async _refreshAccessTokenIfNeed() {

    this.tokenInfo.access_token = '';
    const getAccessToken_data = {
      cmd: {
        getAccessToken: {
          user: this.username,
          password: this.password,
        },
      },
    };

    const response = await axios.post(cloud_url, getAccessToken_data, { headers });
    this.log('Grant access token response from vadactro:', response.data);
    const expires_in = response.data.getAccessToken.expires_in;
    return expires_in;
  }

  public async getDevices() {
    const login_data = {
      cmd: {
        login: {
          user: this.username,
          password: this.password,
        },
      },
    };

    this.log('Triggering the Login API');
    const response = await axios.post(cloud_url, login_data, { headers });
    this.log('Login data response from vadactro:', JSON.stringify(response.data));
    const responseData = response.data.login;
    const devices: any[] = []; // Replace 'any' with the actual type of your devices array elements

    if (responseData.msg === 'success') {
      for (let k = 0; k < responseData.data.dnsListData.length; k++) {
        for (let j = 0; j < responseData.data.dnsListData[k].groupList.length; j++) {
          try {
            if (responseData.data.dnsListData[k].groupList[j].ns.length > 0){
              for (let i = 0; i < responseData.data.dnsListData[k].groupList[j].ns.length; i++) {
                const device_obj = responseData.data.dnsListData[k].groupList[j].ns[i];
                device_obj['room'] = responseData.data.dnsListData[k].groupList[j].groupName;
                device_obj['uuid'] = responseData.data.dnsListData[k].uuid;
                device_obj['bus'] = responseData.data.dnsListData[k].bus;
                device_obj['rmacid'] = responseData.data.dnsListData[k].rmacid;
                device_obj['ip_address'] = responseData.data.dnsListData[k].ipAddress;
                devices.push(device_obj);
              }
            }
          } catch(e) {

          }
        }
        this.Device_List.push({uuid: responseData.data.dnsListData[k].uuid});
      }

    } else {
      this.log('Wrong username or password');
    }

    this.log("Device Final Array:", devices);
    this.log('Generating the Access key');
    const expiry_time = await this._refreshAccessTokenIfNeed();
    this.set_refresh_Interval(expiry_time)
    await this._GrantAccess();

    /**
     * Get the Device type for the device with -1 in "nt" parameter
     * Fetch the list and add in array:
     * islands:[{ bus_id: 0, groups:[{ nodes:[{ address: 1, node_type: "?" }]}]}]
     */


    for (var i=0; i<devices.length; i++) {

        const get_device_type = {
          access_token: this.tokenInfo.access_token,
          dlm_access_token: this.dlm_access_token,
          ip_address: devices[i].ip_address,
          uuid: devices[i]['uuid'],
          cmd:  {
            islands: [{ bus_id: devices[i]['bus'], groups:[{ nodes:[{ address: devices[i]['nk'], node_type: "?" }]}]}]
          }
        }

        const type = await this._GetDeviceType(get_device_type);
        if (type === 'GetDeviceTypeFailed'){
          this.log('Get DeviceType Failed failed for', devices[i]['nn']);
        } else {
          this.log('Correct device type found for Device', devices[i].nk, 'with Type:',type);
          switch(type) {
            case 'SL-SW':
              devices[i]['nt'] = 'SL-SW';
              break;
            case 'SL-PLUG':
              devices[i]['nt'] = 'SL-PLUG';
              break;
            case 'SL-DSW':
              devices[i]['nt'] = 'SL-DSW';
              break;
            case 'SL-LEDM':
              devices[i]['nt'] = 'SL-LEDM';
              break;
            case 'SL-FAN':
              devices[i]['nt'] = 'SL-FAN';
              break;
            case 'SL-CMC':
              devices[i]['nt'] = 'SL-CMC';
              break;
            case 'SL-RGBC':
              devices[i]['nt'] = 'SL-RGBC';
              break;
            case 'SL-WCT':
              devices[i]['nt'] = 'SL-WCT';
            case 'SL-MULTI':
              this.log('Device type is SL-Multi, checking for its internal configuration');
            break;
            default:
              this.log('Unknown Device Type',  type);
          }
        }
    }
    return devices;
  }

  private async _GrantAccess() {
    const grant_access_data = {
      cmd: {
        grantAccess: {
          user: this.dlm_user_email,
          password: this.dlm_user_password,
          deviceList: this.Device_List,
          assignee: this.assignee_details,
        },
      },
    };

    const response = await axios.post(cloud_url, grant_access_data, { headers });
    this.log('Grant DLM access token response from vadactro:', response.data);
    this.log('Grant Access:', JSON.stringify(response.data.grantAccess.access_token));
    this.dlm_access_token = response.data.grantAccess.access_token,
    this.log('Update Token', this.dlm_access_token);
    await this.delay(1000);
  }

  private async _GetDeviceType(get_type: any){
    let get_device_type = get_type;
    /***
     * Post API to Get Response from cloud
     * Expected response :  {"islands":[{"bus_id":0, "groups":[{"nodes":[{"address":63,"node_type":"SL-FAN"}]}]}],”status”:”pass”}
     */
    this.log('Get Device Type Object', JSON.stringify(get_device_type));
    await this.delay(1500);
    let response: any;
    try {
       response = await axios.post(local_url, get_device_type, { headers });
       this.log('Get Device type response from vadactro:', JSON.stringify(response.data));


    /**
     * Analysis the data to get info for sl-multi-device type:
     *  {"islands":[{"bus_id":0, "groups":[{"nodes":[{"address":63,"node_type":"SL-MULTI"}]}]}],”status”:”pass”}
     *  and push into the data:
     *  {"islands":[{"bus_id":0, "groups":[{"nodes":[{"address":63,"multi_node_type":"?"}]}]}]}
     */
    if (response.data.status == 'pass'){
      let node_t = response.data.islands[0].groups[0].nodes[0]['node_type'];
      if (node_t === 'SL-MULTI') {
        let get_multi_type : any[] = [{ bus_id: response.data.islands[0].bus_id , groups:[{ nodes:[{address: response.data.islands[0].groups[0].nodes[0]['address'], multi_node_type: "?"}]}]}];
        const multi_node_type = await this._GetMultiType(get_multi_type, get_type.uuid, get_type.ip_address);
        if (multi_node_type === 'SL-DT8') {
          let final_node_type = await this._GetDT8Type(response.data.islands[0].bus_id ,response.data.islands[0].groups[0].nodes[0]['address'], get_type.uuid, get_type.ip_address);
                 this.log('Final node type:', final_node_type);
                 if (final_node_type === 'RGBWAF'){
                  return 'SL-RGBC';
                 } else if(final_node_type === 'CT') {
                    return 'SL-WCT';
                 } else {
                  return 'unknown CT';
                 }
        } else {
          return multi_node_type;
        }
      } else {
        return node_t;
      }

    } else {
      this.log('Get Node Type Request failed');
      return 'GetDeviceTypeFailed';
    }
  } catch (e) {
    this.log('Post Request Failed for _GetDeviceType');
  }
  }

  private async _GetMultiType(get_type: any, UUID: any, IP: any){
    await this.delay(500);
    let get_device_type = {
      access_token: this.tokenInfo.access_token,
      dlm_access_token: this.dlm_access_token,
      ip_address: IP,
      uuid: UUID,
      cmd:  {
        islands: get_type
      }
    }
    this.log('Get Multi-Type, full:', JSON.stringify(get_device_type));
    await this.delay(1500);
    let response: any;
    try {
       response = await axios.post(local_url, get_device_type, { headers });
    } catch (e) {
      this.log('Error for Post API _GetMultiType')
    }
    this.log('Get Multi-Type type response from vadactro:', JSON.stringify(response.data));
    if (response.data.status == 'fail'){
      return ('Get Multi-Type type failed');
    } else {
      let multi_node= response.data.islands[0].groups[0].nodes[0].multi_node_type;
      if (multi_node.length > 1){
        if ((multi_node[0].type === 'SL-LEDM' && multi_node[1].type === 'SL-DT8') ||
            (multi_node[1].type === 'SL-LEDM' && multi_node[0].type === 'SL-DT8')){
              return 'SL-WCT';

        }

      } else {
        return multi_node[0]['type'];
      }
    }
	}

  private async _GetDT8Type(bus: any, addr: any, uuid: any, IP: any){
    let get_device_type = {
      access_token: this.tokenInfo.access_token,
      dlm_access_token: this.dlm_access_token,
      uuid: uuid,
      ip_address : IP,
      cmd:  {
        islands:[{bus_id:bus, groups:[{nodes:[{address:addr,color_type:"?"}]}]}]
      }
    }
    await this.delay(1500);
    let response: any;
    try {
      response = await axios.post(local_url, get_device_type, { headers });
    } catch (e) {
      this.log('Request failed for POST API for _GetDT8Type');
    }

    this.log('Get DT8 type response from vadactro:', JSON.stringify(response.data));
    return response.data.islands[0].groups[0].nodes[0].color_type[0].type;
	}

  public async _SetDevice(device: any, value: string, Type: string) {
    this.log('Set Device:', device.nn, value, Type);
    let set_device = {
      access_token: this.tokenInfo.access_token,
      dlm_access_token: this.dlm_access_token,
      uuid: device.uuid,
      ip_address: device.ip_address,
      cmd: {
        islands: [{
            bus_id: device.bus,
            groups: [{
                nodes: [{
                    address: parseInt(device.nk),
                  }],
              }],
          }],
      },
    };
    switch (Type) {
      case 'SetState':
        set_device.cmd.islands[0].groups[0].nodes[0][device.nt] = { state: value };
      break;

      case 'SetLevel':
        set_device.cmd.islands[0].groups[0].nodes[0][device.nt] = { level: value };
      break;

      case 'SetCT':
        set_device.cmd.islands[0].groups[0].nodes[0][device.nt] =  { color_temperature: value };
      break;

      case 'SetPosition':
        set_device.cmd.islands[0].groups[0].nodes[0][device.nt] =  { position: value };
      break;

      case 'SetRGBColor':
        set_device.cmd.islands[0].groups[0].nodes[0][device.nt] = { color:{red: value[0], green: value[1], blue: value[2] }};
      break;

      case 'SetRGBState':
        set_device.cmd.islands[0].groups[0].nodes[0][device.nt] = { state: value };
      break;

      case 'SetRGBLevel':
        set_device.cmd.islands[0].groups[0].nodes[0][device.nt] = { level: value };
      break;

      default:
        this.log('No Specific type of trigger command found');
      break;
    }

    this.log('Set Device:', JSON.stringify(set_device));
    const response = await axios.post(local_url, set_device, { headers });
    return response;
  }
  private async delay(ms: any) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export = SLBusAPI;