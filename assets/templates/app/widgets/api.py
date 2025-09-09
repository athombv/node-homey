from typing import Any

from homey.homey import Homey


async def get_something(
    *, query: dict[str, str], params: dict[str, str], body: Any, homey: Homey
):
    return "Hello from App"


async def add_something(
    *, query: dict[str, str], params: dict[str, str], body: Any, homey: Homey
):
    return homey.app.add_something(body)


async def update_something(
    *, query: dict[str, str], params: dict[str, str], body: Any, homey: Homey
):
    return homey.app.update_something(body)


async def delete_something(
    *, query: dict[str, str], params: dict[str, str], body: Any, homey: Homey
):
    return homey.app.delete_something(params["id"])


# Export these methods as endpoints
__all__ = ["get_something", "add_something", "update_something", "delete_something"]
