const env = require('../config/env');

const getSystemHealth = async () => {
  return {
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'Backend service is healthy',
    environment: env.NODE_ENV
  };
};

module.exports = {
  getSystemHealth
};
