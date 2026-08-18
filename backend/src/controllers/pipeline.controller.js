const pipelineService = require('../services/pipeline.service');

/**
 * Gets the current data pipeline execution status and counts.
 */
const getStatus = (req, res, next) => {
  try {
    const state = pipelineService.getPipelineState();
    return res.status(200).json(state);
  } catch (err) {
    next(err);
  }
};

/**
 * Triggers the execution of the ETL data pipeline.
 * Runs asynchronously and returns 202 Accepted immediately if launched successfully.
 */
const run = async (req, res, next) => {
  try {
    await pipelineService.runPipeline();
    const state = pipelineService.getPipelineState();
    return res.status(202).json({
      message: 'Data pipeline execution triggered successfully.',
      state
    });
  } catch (err) {
    if (err.message === 'Pipeline is already running.') {
      return res.status(409).json({
        status: 'CONFLICT',
        message: 'A pipeline execution is already in progress. Concurrent execution is blocked.'
      });
    }
    next(err);
  }
};

module.exports = {
  getStatus,
  run
};
