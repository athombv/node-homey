import homey

class Device(homey.Device):

    async def on_init(self):
      """onInit is called when the device is initialized."""
      self.log('MyDevice has been initialized')