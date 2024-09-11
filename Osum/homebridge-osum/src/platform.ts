import node_serv = require('./server/node_server');

import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import * as fs from 'fs';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { DimmerAccessory } from './accessory/DimmerAccessory';
import { SwitchAccessory } from './accessory/SwitchAccessory';
import { CCTAccessory } from './accessory/CCTAccessory';
import { FanAccessory } from './accessory/FanAccessory';
import { CurtainAccessory } from './accessory/CurtainAccessory';
import { RGBAccessory } from './accessory/RGBAccessory';

import SLBUSAPI from './lib/SL_BUS-HTTAPI';
const dlm_user_email='sachin@osum.in';
const dlm_user_password='osum@2022';
const assignee_details ='osum';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class Osum_SL_Bus implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices(config);
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    accessory.context.reviewed = false;
    this.accessories.push(accessory);
  }


  async discoverDevices(config) {
    let devices: any;
    const api = new SLBUSAPI(
      dlm_user_email || config.dlm_user_email,
      dlm_user_password || config.dlm_user_password,
      assignee_details || config.assignee_details,
      config.username,
      config.password,
      this.log,
    );
    try {
      this.log.info('Fetching the device list');
      devices = await api.getDevices();
      this.log.info('Device list fetch from cloud:', JSON.stringify(devices));
    } catch (e: any) {
      this.log.error(e, devices);
      if (e instanceof Error) {
        this.log.error(JSON.stringify(e));
        this.log.error('Failed to get device information. Please check if the config.json is correct.');
        this.log.info('Fetching the latest device failed. Loading the last list successfully fetch.......');
        devices = fs.readFileSync('/home/homebridge/Device_data.txt', 'utf8', (err: any, data: any) => {
         if (err) {
            console.log('No Old Devices found',err);
         }
         console.log('Old device found:', data);
        });
        devices =  JSON.parse(devices);
      }
    }

    if (typeof devices == 'object'){
      fs.writeFileSync('/home/homebridge/Device_data.txt', JSON.stringify(devices), 'utf8');
      this.log.info('Device data is updated');
    } else if (devices == 'Getting device list failed') {
      this.log.info('Fetching the latest device failed. Loading the last list successfully fetch.......');
      devices = fs.readFileSync('/home/homebridge/Device_data.txt', 'utf8',(err: any, data: any) => {
        if (err) {
            console.log('No Old Devices found',err);
        }
        console.log('Old device found:', data);
    });
      devices =  JSON.parse(devices);
    } else {
      this.log.error('Unknown error');
    }

    if (typeof devices == 'object'){
      for (const device of devices) {
        if (device.nt === 'SL-DSW' || device.nt === 'SL-LEDM'){
          const uuid = this.api.hap.uuid.generate(device.nn+ device.bus.toString()+ device.nk.toString());
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new DimmerAccessory(this, existingAccessory, api, device);
            existingAccessory.context.reviewed = true;
          } else {
            this.log.info('Adding new accessory:', device.nn);
            const accessory = new this.api.platformAccessory(device.nn+ device.bus.toString()+ device.nk.toString(), uuid);
            accessory.context.device = device; // device.nn+ device.bus.toString()+ device.nk.toString();
            new DimmerAccessory(this, accessory, api, device);
            accessory.context.reviewed = true;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        } else if (device.nt === 'SL-SW' || device.nt === 'SL-PLUG'){
          const uuid = this.api.hap.uuid.generate(device.nn+ device.bus.toString()+ device.nk.toString());
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new SwitchAccessory(this, existingAccessory, api, device);
            existingAccessory.context.reviewed = true;
          } else {
            this.log.info('Adding new accessory:', device.nn+ device.bus.toString()+ device.nk.toString());
            const accessory = new this.api.platformAccessory(device.nn+ device.bus.toString()+ device.nk.toString(), uuid);
            accessory.context.device = device; // device.nn+ device.bus.toString()+ device.nk.toString();
            new SwitchAccessory(this, accessory, api, device);
            accessory.context.reviewed = true;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        } else if (device.nt === 'SL-WCT'){
          const uuid = this.api.hap.uuid.generate(device.nn+ device.bus.toString()+ device.nk.toString());
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new CCTAccessory(this, existingAccessory, api, device);
            existingAccessory.context.reviewed = true;
          } else {
            this.log.info('Adding new accessory:', device.nn+ device.bus.toString()+ device.nk.toString());
            const accessory = new this.api.platformAccessory(device.nn+ device.bus.toString()+ device.nk.toString(), uuid);
            accessory.context.device = device; // device.nn+ device.bus.toString()+ device.nk.toString();
            new CCTAccessory(this, accessory, api, device);
            accessory.context.reviewed = true;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        } else if (device.nt === 'SL-FAN'){
          const uuid = this.api.hap.uuid.generate(device.nn+ device.bus.toString()+ device.nk.toString());
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new FanAccessory(this, existingAccessory, api, device);
            existingAccessory.context.reviewed = true;
          } else {
            this.log.info('Adding new accessory:', device.nn+ device.bus.toString()+ device.nk.toString());
            const accessory = new this.api.platformAccessory(device.nn+ device.bus.toString()+ device.nk.toString(), uuid);
            accessory.context.device = device; // device.nn+ device.bus.toString()+ device.nk.toString();
            new FanAccessory(this, accessory, api, device);
            accessory.context.reviewed = true;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        } else if (device.nt === 'SL-CMC'){
          const uuid = this.api.hap.uuid.generate(device.nn+ device.bus.toString()+ device.nk.toString());
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new CurtainAccessory(this, existingAccessory, api, device);
            existingAccessory.context.reviewed = true;
          } else {
            this.log.info('Adding new accessory:', device.nn+ device.bus.toString()+ device.nk.toString());
            const accessory = new this.api.platformAccessory(device.nn+ device.bus.toString()+ device.nk.toString(), uuid);
            accessory.context.device = device; // device.nn+ device.bus.toString()+ device.nk.toString();
            new CurtainAccessory(this, accessory, api, device);
            accessory.context.reviewed = true;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        } else if (device.nt === 'SL-RGBC'){
          const uuid = this.api.hap.uuid.generate(device.nn+ device.bus.toString()+ device.nk.toString());
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new RGBAccessory(this, existingAccessory, api, device);
            existingAccessory.context.reviewed = true;
          } else {
            this.log.info('Adding new accessory:', device.nn+ device.bus.toString()+ device.nk.toString());
            const accessory = new this.api.platformAccessory(device.nn+ device.bus.toString()+ device.nk.toString(), uuid);
            accessory.context.device = device; // device.nn+ device.bus.toString()+ device.nk.toString();
            new RGBAccessory(this, accessory, api, device);
            accessory.context.reviewed = true;
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        } else {
          this.log.info('Unsupported Device:', device.nn, device.nt);
        }
      }
    }

    // loop over the discovered devices and register each one if it has not already been registered
 

    this.accessories.forEach((a) => {
      if (!a.context.reviewed) {
        this.removeAccessory(a);
      }
    });
  }

  removeAccessory(accessory) {
    this.log.info('Remove accessory: ', accessory.displayName);
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    this.accessories.forEach((element, index) => {
      if (element.UUID === accessory.uuid) {
        this.accessories.splice(index, 1);
      }
    });
  }
}