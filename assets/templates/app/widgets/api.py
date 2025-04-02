async def get_something(*args, **kwargs):
    return 'Hello from App'

async def add_something(*args, **kwargs):
    homey = kwargs.get('homey', None)
    return homey.app.add_something(**kwargs)

async def update_something(*args, **kwargs):
    homey = kwargs.get('homey', None)
    return homey.app.update_something(**kwargs)

async def delete_something(*args, **kwargs):
    homey = kwargs.get('homey', None)
    return homey.app.delete_something(**kwargs)


# Export all these methods as a endpoint
__all__ = [
    'get_something',
    'add_something',
    'update_something',
    'delete_something'
]
