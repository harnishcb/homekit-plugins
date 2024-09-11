import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { Osum_SL_Bus } from '../platform';
import { myEmitter } from '../lib/tcp';

export class DimmerAccessory {
  private service: Service;
  private current_state = {
    On: false,
    Brightness: 100,
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

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.device.room + accessory.context.device.nn);
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))      // SET - bind to the 'setBrightness` method below
      .onGet(this.getBrightness.bind(this));

    this.api = api;
    this.device = device;

    myEmitter.on('Feedback'+device.rmacid+device.bus.toString()+device.nk.toString(), (data) => {
      this.platform.log.info('Data received for Dimmer Accessory:', data.toString());
      data = JSON.parse(data);
      data = data.periodicdata.devsts.data[0];
      const device_no = data.ad.toString();
    //  if (device_no === device.nk.toString()) {
      const value = Math.ceil(parseInt(data.vl)/2.55);
      this.updateCharacteristics(value);
      this.current_state = {
        On: Boolean(value),
        Brightness: value,
      };
     // }
    });
  }

  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.current_state.On = value as boolean;
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
    const isOn = this.current_state.On;
    this.platform.log.info('Get Characteristic On ->', isOn);
    return isOn;
  }

  async setBrightness(value: CharacteristicValue) {
    this.current_state.Brightness = value as number;
    this.platform.log.info('Set Characteristic Brightness -> ', value);
    value = value+'%';
    const response: any = await this.api._SetDevice(this.device, value.toString(), 'SetLevel');
    this.platform.log.info(JSON.stringify(response.data));
  }

  async getBrightness(): Promise<CharacteristicValue> {
    const isOn = this.current_state.Brightness;
    this.platform.log.info('Get Characteristic Brightness ->', isOn);
    return isOn;
  }

  async updateCharacteristics(value: CharacteristicValue) {
    this.platform.log.info('Set Characteristic Brightness -> ', value);
    this.service.updateCharacteristic(this.platform.Characteristic.On, Boolean(value));
    this.service.updateCharacteristic(this.platform.Characteristic.Brightness, value);
  }
}