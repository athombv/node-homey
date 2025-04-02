import homey

class Driver(homey.Driver):

    async def on_init(self):
        """on_init is called when the driver is initialized."""
        self.log('My Driver has been initialized')

    async def on_pair_list_devices(self, data):
        """
        on_pair_list_devices is called when a user is adding a device
        and the 'list_devices' view is called.
        This should return an array with the data of devices that are available for pairing.
        """
        return [
            # Example device data, note that `store` is optional
            # {
            #     "name": 'My Devicee',
            #     "data": {
            #         "id": 'my-device',
            #     },
            #     "store": {
            #         "address": '127.0.0.1',
            #     }
            # }
        ]
