import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { Osum_SL_Bus } from '../platform';
import { myEmitter } from '../lib/tcp';

export class CurtainAccessory {
  private service: Service;
  private current_state = {
    CurrentPosition: 100,
    TargetPosition: 100,
    PositionState: 2,
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

    this.service = this.accessory.getService(this.platform.Service.WindowCovering) ||
    this.accessory.addService(this.platform.Service.WindowCovering);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.device.room + accessory.context.device.nn);
    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onSet(this.setTargetPosition.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getTargetPosition.bind(this));               // GET - bind to the `getOn` method below
    this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.getCurrentPosition.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(this.getPositionState.bind(this));
    this.api = api;
    this.device = device;

    myEmitter.on('Feedback'+device.rmacid+device.bus.toString()+device.nk.toString(), (data) => {
      this.platform.log.info('Data received for Curtain Accessory:', data.toString());
      data = JSON.parse(data);
      data = data.periodicdata.devsts.data[0];
      const device_no = data.ad.toString();
   //   if (device_no === device.nk.toString()) {
        const value = Math.ceil(parseInt(data.vl)/2.55);
        this.updateCharacteristics(value);
        this.current_state = {
          CurrentPosition: value,
          TargetPosition: value,
          PositionState: 2,
        };
 //     }
    });
  }

  async setTargetPosition(value: CharacteristicValue) {
    this.current_state.TargetPosition = value as number;
    this.current_state.CurrentPosition = value as number;
    this.platform.log.info('Set Characteristic On ->', value);
    const response: any = await this.api._SetDevice(this.device, value.toString()+'%', 'SetPosition');
    this.platform.log.info(JSON.stringify(response.data));

  }

  async getTargetPosition(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.current_state.TargetPosition;
    this.platform.log.info('Get Characteristic TargetPosition ->', isOn);
    return isOn;
  }


  async getCurrentPosition(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.current_state.CurrentPosition;
    this.platform.log.info('Get Characteristic CurrentPosition ->', isOn);
    return isOn;
  }

  async getPositionState(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.current_state.PositionState;
    this.platform.log.info('Get Characteristic PositionState ->', isOn);
    return isOn;
  }

  async updateCharacteristics(value: CharacteristicValue) {
    this.platform.log.info('Set Characteristic Brightness -> ', value);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, value);
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, value);
  }
}