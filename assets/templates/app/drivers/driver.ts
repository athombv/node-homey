import { Driver } from 'homey';
interface pairInfo {
  name: string,
  data: {
    id: string,
  },
  store?: {
    address: string,
  },
  settings?: {
    pincode: string,
  }
  icon?: string,
  capabilities?: string[],
  capabilitiesOptions?: {},
}

class MyDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices(): Promise<pairInfo[]> {
    return [
      {
        name: 'My Device',
        data: {
          id: 'my-device',
        },
        store: {
          address: '127.0.0.1',
        },
      },
    ];
  }
}

module.exports = MyDriver;