import asyncio
import logging
from collections import defaultdict
from typing import Callable, Awaitable, DefaultDict, List

from app.events.event_types import DomainEvent, EventType

logger = logging.getLogger(__name__)

Handler = Callable[[DomainEvent], Awaitable[None]]


class EventBus:
    """
    In-process async event bus.
    Designed to be swapped for Redis pub/sub or a message queue later.
    """

    def __init__(self):
        self._handlers: DefaultDict[EventType, List[Handler]] = defaultdict(list)
        self._queue: asyncio.Queue[DomainEvent] = asyncio.Queue()
        self._task: asyncio.Task | None = None

    def subscribe(self, event_type: EventType, handler: Handler) -> None:
        self._handlers[event_type].append(handler)
        logger.debug(f"Handler {handler.__name__} subscribed to {event_type}")

    async def publish(self, event: DomainEvent) -> None:
        await self._queue.put(event)

    async def _process_loop(self) -> None:
        while True:
            event = await self._queue.get()
            handlers = self._handlers.get(event.event_type, [])
            for handler in handlers:
                try:
                    await handler(event)
                except Exception as e:
                    logger.error(f"Event handler error [{event.event_type}]: {e}")
            self._queue.task_done()

    async def start(self) -> None:
        self._task = asyncio.create_task(self._process_loop())
        logger.info("EventBus started.")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
        logger.info("EventBus stopped.")


# Application-scoped singleton
event_bus = EventBus()