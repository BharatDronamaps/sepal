import logging
import random
import time

import ee
from ee.batch import Task

from ..retry import retry
from ..task.task import ThreadTask

logger = logging.getLogger(__name__)


class State(object):
    PENDING = 'PENDING'
    ACTIVE = 'ACTIVE'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'


class MonitorEarthEngineExportTask(ThreadTask):
    def __init__(self, credentials, task_id, destination):
        super(MonitorEarthEngineExportTask, self).__init__('MonitorEarthEngineTask')
        self.credentials = credentials
        self.task_id = task_id
        self.destination = destination
        self._status = {
            'state': State.PENDING
        }

    def run(self):
        logger.info('Monitoring Earth Engine export. task_id: {0}, destination: {1}'
                    .format(self.task_id, self.destination))
        ee.InitializeThread(self.credentials)
        while self.running():
            time.sleep(10)
            self.check()

    def check(self):
        if not self.running():
            return
        status = retry(lambda: self.load_status(), 'Load GEE background task status', 10)
        state = status['state']
        if state == Task.State.READY:
            self._update_state(State.PENDING)
        elif state == Task.State.RUNNING:
            self._update_state(State.ACTIVE)
        elif state == Task.State.COMPLETED:
            self._update_state(State.COMPLETED)
            self.resolve()
            return
        else:
            error_message = status[
                'error_message'] if state == Task.State.FAILED else 'Earth Engine export was canceled'
            self._status = {
                'state': State.FAILED,
                'message': error_message
            }
            logger.exception('Earth Engine export failed')
            raise Exception(
                error_message if error_message else 'Earth Engine export failed'
            )

    def load_status(self):
        task = find_task(self.task_id)
        return task.status()

    def status(self):
        return self._status

    def status_message(self):
        state = self.status()['state']
        if state == State.PENDING:
            return 'Export pending...'
        if state == State.ACTIVE:
            return 'Exporting...'
        if state == State.COMPLETED:
            return 'Export complete'
        if state == State.FAILED:
            return 'Export failed: {}'.format(self.status()['message'])

    def close(self, retry=0):
        try:
            ee.InitializeThread(self.credentials)
            task = find_task(self.task_id)
            if task and task.state in (Task.State.READY, Task.State.RUNNING):
                logger.debug('Canceling Earth Engine Task {0}: {1}'.format(self, task.status()))
                task.cancel()
        except ee.EEException as e:
            logger.warn('Failed to cancel task {0}: {1}'.format(self, e))
            if retry < 3:
                throttle_seconds = max(2 ^ retry * random.uniform(0.1, 0.2), 30)
                time.sleep(throttle_seconds)
                self.close(retry + 1)

    def _update_state(self, state):
        previous_state = self._status['state']
        if previous_state != state:
            self._status['state'] = state
            logger.info('destination={0}, task_id={1}: {2} -> {3}'
                        .format(self.destination, self.task_id, previous_state, state))

    def __str__(self):
        return '{0}(destination={1}, task_id={2})'.format(type(self).__name__, self.destination, self.task_id)


def find_task(task_id):
    return next(task for task in Task.list() if task.id == task_id)
