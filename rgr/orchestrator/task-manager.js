class TaskManager {
  constructor () {
    this.resultMap = {};
  }

  addTask(taskId, resultCount, callback) {
    this.resultMap[taskId] = {
      results: [],
      count: resultCount,
      callback
    };
  }

  getTaskObject(taskId) {
    const taskObject = this.resultMap[taskId];
    if (!taskObject) {
      throw new Error(`Task with ID "${taskId}" does not exist`);
    }

    return taskObject;
  }

  addResult(taskId, result) {
    const taskObject = this.getTaskObject(taskId);
    taskObject.results.push(result);

    if (taskObject.results.length === taskObject.count) {
      this.finalize(taskId);
    }
  }

  finalize(taskId) {
    const taskObject = this.getTaskObject(taskId);
    taskObject.callback(taskObject.results);
    delete this.resultMap[taskId];
  }
}

module.exports = TaskManager;
