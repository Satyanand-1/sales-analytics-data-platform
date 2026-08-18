const healthService = require('../services/health.service');

const checkHealth = async (req, res, next) => {
  try {
    const health = await healthService.getSystemHealth();
    return res.status(200).json(health);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkHealth
};
