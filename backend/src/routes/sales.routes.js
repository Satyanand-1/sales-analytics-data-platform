const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');

// Customers routing
router.get('/customers', salesController.getCustomers);
router.post('/customers', salesController.createCustomer);

// Products routing
router.get('/products', salesController.getProducts);
router.post('/products', salesController.createProduct);

// Orders routing
router.get('/orders', salesController.getOrders);
router.post('/orders', salesController.createOrder);

module.exports = router;
