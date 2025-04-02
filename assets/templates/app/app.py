import homey


class App(homey.App):

    async def on_init(self):
      """ on_init is called when the app is initialized. """
      self.log('MyApp has been initialized')
