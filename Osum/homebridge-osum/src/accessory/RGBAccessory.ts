import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { Osum_SL_Bus } from '../platform';
import { myEmitter } from '../lib/tcp';
import { hsvToRgb } from '../lib/ColorConvert';
export class RGBAccessory {
  private service: Service;
  private current_state = {
    On: false,
    Brightness: 100,
    Hue: 0,
    Saturation: 100
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
      .setCharacteristic(this.platform.Characteristic.Model, 'Osum_SL-RGBC')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    this.service.setCharacteristic(this.platform.Characteristic.Name,this.device.room + accessory.context.device.nn);
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(this.getBrightness.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.Hue)
      .onSet(this.setHue.bind(this))
      .onGet(this.getHue.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.Saturation)
      .onSet(this.setSaturation.bind(this))
      .onGet(this.getSaturation.bind(this));
    this.api = api;
    this.device = device;

    myEmitter.on('Feedback'+device.rmacid+device.bus.toString()+device.nk.toString(), (data) => {
      this.platform.log.info('Data received for RGB Accessory:', data.toString());
      data = JSON.parse(data);
      data = data.periodicdata.devsts.data[0];
      const device_no = data.ad.toString();
   //   if (device_no === device.nk.toString()) {
        const value = Math.ceil(parseInt(data.vl)/2.55);
        this.updateCharacteristics(value);
        this.current_state = {
          On: Boolean(value),
          Brightness: value,
          Hue: 0,
          Saturation: 100
        };
   //   }
    });
  }

  async setOn(value: CharacteristicValue) {
    this.current_state.On = value as boolean;
    this.platform.log.info('Set Characteristic On ->', value);
    if (typeof value === 'boolean' && value === false) {
      value = 'off';
      const response: any = await this.api._SetDevice(this.device, value.toString(), 'SetRGBState');
      this.platform.log.info(JSON.stringify(response.data));
    } else {
      this.current_state.Brightness = 100;
      this.setRGB();
      value = 'on';
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.current_state.On;
    this.platform.log.info('Get Characteristic On ->', isOn);
    return isOn;
  }

  async setBrightness(value: CharacteristicValue) {
    this.current_state.Brightness = value as number;
    this.platform.log.info('Set Characteristic Brightness -> ', value);
    value = value+'%';
    const response: any = await this.api._SetDevice(this.device, value.toString(), 'SetRGBLevel');
    this.platform.log.info(JSON.stringify(response.data));
  }

  async getBrightness(): Promise<CharacteristicValue> {
    const isOn = this.current_state.Brightness;
    this.platform.log.info('Get Characteristic Brightness ->', isOn);
    return isOn;
  }

  async setHue(value: CharacteristicValue) {
    this.current_state.Hue = value as number;
    this.platform.log.info('Set Characteristic Hue -> ', value);
    this.setRGB();
  }

  async getHue(): Promise<CharacteristicValue> {
    const isOn = this.current_state.Hue;
    this.platform.log.info('Get Characteristic Hue ->', isOn);
    return isOn;
  }

  async setSaturation(value: CharacteristicValue) {
    this.current_state.Saturation = value as number;
    this.platform.log.info('Set Characteristic Saturation -> ', value);
  }

  async getSaturation(): Promise<CharacteristicValue> {
    const isOn = this.current_state.Saturation;
    this.platform.log.info('Get Characteristic Saturation ->', isOn);
    return isOn;
  }

  async setRGB(){
    let value = hsvToRgb(this.current_state.Hue, this.current_state.Saturation, this.current_state.Brightness)
    const response: any = await this.api._SetDevice(this.device, value, 'SetRGBColor');
    this.platform.log.info('Response Received from Osum server:', JSON.stringify(response.data));
  }

  async updateCharacteristics(value: CharacteristicValue) {
    this.platform.log.info('Set Characteristic Brightness -> ', value);
    this.service.updateCharacteristic(this.platform.Characteristic.On, Boolean(value));
    this.service.updateCharacteristic(this.platform.Characteristic.Brightness, value);
  }
}