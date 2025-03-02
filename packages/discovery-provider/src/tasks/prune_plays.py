import logging
import time
from datetime import datetime, timedelta

from sqlalchemy import text

from src.tasks.celery_app import celery
from src.utils.prometheus_metric import save_duration_metric

logger = logging.getLogger(__name__)

PLAYS_ARCHIVE_TABLE_NAME = "plays_archive"

PRUNE_PLAYS_QUERY = """
    with to_prune as (
        select
            id
        from
            plays
        where
            plays.created_at <= :cutoff_timestamp
        order by
            plays.created_at asc
        limit
            :max_batch
    )
    delete from
        plays
    where
        id in (select id from to_prune)
    """

# Prune up to the cutoff date
# start at all plays before 2020 (328751 total)
# TODO move to a sliding window
current_date = datetime.now()
year_before_current_date = current_date - timedelta(days=400)
DEFAULT_CUTOFF_TIMESTAMP = datetime.fromisoformat(year_before_current_date.isoformat())

# max number of plays to prune per run
# 50000 max * 8 runs a day = 400000 plays per day
DEFAULT_MAX_BATCH = 50000


def _prune_plays(
    session,
    cutoff_timestamp=DEFAULT_CUTOFF_TIMESTAMP,
    max_batch=DEFAULT_MAX_BATCH,
):
    # archive and prune plays at most max_batch plays before cutoff_timestamp
    session.execute(
        text(PRUNE_PLAYS_QUERY),
        {
            "cutoff_timestamp": cutoff_timestamp,
            "max_batch": max_batch,
        },
    )


# ####### CELERY TASKS ####### #
@celery.task(name="prune_plays", bind=True)
@save_duration_metric(metric_group="celery_task")
def prune_plays(self):
    # Cache custom task class properties
    # Details regarding custom task context can be found in wiki
    # Custom Task definition can be found in src/app.py
    db = prune_plays.db
    redis = prune_plays.redis
    # Define lock acquired boolean
    have_lock = False
    # Define redis lock object
    update_lock = redis.lock("prune_plays_lock", timeout=7200)
    try:
        # Attempt to acquire lock - do not block if unable to acquire
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            start_time = time.time()
            logger.debug("prune_plays.py | Started pruning plays")

            with db.scoped_session() as session:
                _prune_plays(session)

            logger.debug(
                f"prune_plays.py | Finished pruning in: {time.time()-start_time} sec"
            )
        else:
            logger.debug("prune_plays.py | Failed to acquire prune_plays_lock")
    except Exception as e:
        logger.error("prune_plays.py | Fatal error in main loop", exc_info=True)
        raise e
    finally:
        if have_lock:
            update_lock.release()
