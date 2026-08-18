const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipeline.controller');

// GET /api/pipeline/status
router.get('/pipeline/status', pipelineController.getStatus);

// POST /api/pipeline/run
router.post('/pipeline/run', pipelineController.run);

module.exports = router;
