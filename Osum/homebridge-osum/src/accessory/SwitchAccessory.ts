import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { Osum_SL_Bus } from '../platform';
import { myEmitter } from '../lib/tcp';

export class SwitchAccessory {
  private service: Service;
  private exampleStates = {
    On: false,
  };

  constructor(
    private readonly platform: Osum_SL_Bus,
    private readonly accessory: PlatformAccessory,
    private api: any,
    private device: any,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Osum Smart Electrical Solutions')
      .setCharacteristic(this.platform.Characteristic.Model, 'Osum_SL-DSW')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    this.service.setCharacteristic(this.platform.Characteristic.Name,this.device.room + accessory.context.device.nn);
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    this.api = api;
    this.device = device;

    myEmitter.on('Feedback'+device.rmacid+device.bus.toString()+device.nk.toString(), (data) => {
      this.platform.log.info('Data received for Switch Accessory:', data.toString());
      data = JSON.parse(data);
      data = data.periodicdata.devsts.data[0];
      //   if (data.ad.toString() === device.nk.toString()) {
      this.updateCharacteristics(Boolean(parseInt(data.vl)));
    //  }
    });
  }

  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.exampleStates.On = value as boolean;
    this.platform.log.info('Set Characteristic On ->', value);
    if (typeof value === 'boolean' && value === false) {
      value = 'off';
    } else {
      value = 'on';
    }
    const response: any = await this.api._SetDevice(this.device, value.toString(), 'SetState');
    this.platform.log.info(JSON.stringify(response.data));

  }

  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.exampleStates.On;
    this.platform.log.info('Get Characteristic On ->', isOn);
    return isOn;
  }

  async updateCharacteristics(value: CharacteristicValue) {
    this.platform.log.info('Set Characteristic On -> ', value);
    this.service.updateCharacteristic(this.platform.Characteristic.On, value);
  }
}

