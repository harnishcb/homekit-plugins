'use-strict';

import Logger from '../../services/logger/logger.service.js';

export default class DoorbellService {
  constructor(api, accessory, handler) {
    this.api = api;
    this.log = Logger.log;
    this.accessory = accessory;
    this.handler = handler;

    this.getService();
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {
    let service = this.accessory.getServiceById(this.api.hap.Service.Doorbell, 'doorbell');
    let switchService = this.accessory.getServiceById(this.api.hap.Service.Switch, 'DoorbellTrigger');

    if (this.accessory.context.config.doorbell) {
      if (!service) {
        this.log.debug('Adding doorbell service', this.accessory.displayName);
        service = this.accessory.addService(
          this.api.hap.Service.Doorbell,
          this.accessory.displayName + ' Doorbell',
          'doorbell'
        );
      }
    } else {
      if (service) {
        this.log.debug('Removing doorbell service', this.accessory.displayName);
        this.accessory.removeService(service);
      }
    }

    if (this.accessory.context.config.doorbell && this.accessory.context.config.switches) {
      if (!switchService) {
        this.log.debug('Adding switch service (doorbell)', this.accessory.displayName);
        switchService = this.accessory.addService(
          this.api.hap.Service.Switch,
          this.accessory.displayName + ' Doorbell Trigger',
          'DoorbellTrigger'
        );
      }

      switchService.getCharacteristic(this.api.hap.Characteristic.On).onSet(async (state) => {
        //this.log.info(`Doorbell ${state ? 'activated!' : 'deactivated!'}`, this.accessory.displayName);
        await this.handler.handle('doorbell', this.accessory.displayName, state, true);
      });
    } else {
      if (switchService) {
        this.log.debug('Removing switch service (doorbell)', this.accessory.displayName);
        this.accessory.removeService(switchService);
      }
    }
  }
}
