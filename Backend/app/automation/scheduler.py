import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler():
    scheduler.start()
    logger.info("APScheduler started.")


def stop_scheduler():
    scheduler.shutdown()
    logger.info("APScheduler stopped.")


def add_feeding_reminder(cat_id: str, cron_expr: str, callback):
    """
    Schedule a recurring feeding reminder for a cat.
    cron_expr example: "0 8 * * *" = every day at 8am
    """
    scheduler.add_job(
        callback,
        trigger=CronTrigger.from_crontab(cron_expr),
        id=f"feeding_{cat_id}",
        replace_existing=True,
        kwargs={"cat_id": cat_id},
    )
    logger.info(f"Feeding reminder scheduled for cat {cat_id}: {cron_expr}")