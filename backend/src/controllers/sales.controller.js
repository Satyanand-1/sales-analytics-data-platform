const salesService = require('../services/sales.service');

const getCustomers = async (req, res, next) => {
  try {
    const customers = await salesService.getCustomers();
    return res.status(200).json(customers);
  } catch (err) {
    next(err);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const customer = await salesService.createCustomer(req.body);
    return res.status(201).json({
      message: 'Customer created successfully.',
      customer
    });
  } catch (err) {
    // If validation fails, return 400 Bad Request
    return res.status(400).json({
      status: 'VALIDATION_ERROR',
      message: err.message
    });
  }
};

const getProducts = async (req, res, next) => {
  try {
    const products = await salesService.getProducts();
    return res.status(200).json(products);
  } catch (err) {
    next(err);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await salesService.createProduct(req.body);
    return res.status(201).json({
      message: 'Product created successfully.',
      product
    });
  } catch (err) {
    return res.status(400).json({
      status: 'VALIDATION_ERROR',
      message: err.message
    });
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await salesService.getOrders();
    return res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const order = await salesService.createOrder(req.body);
    return res.status(201).json({
      message: 'Order created successfully.',
      order
    });
  } catch (err) {
    return res.status(400).json({
      status: 'VALIDATION_ERROR',
      message: err.message
    });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  getProducts,
  createProduct,
  getOrders,
  createOrder
};
