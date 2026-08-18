const express = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/analytics/revenue', analyticsController.getRevenue);
router.get('/analytics/sales-by-product', analyticsController.getSalesByProduct);
router.get('/analytics/sales-by-city', analyticsController.getSalesByCity);
router.get('/analytics/daily-sales', analyticsController.getDailySales);

module.exports = router;
