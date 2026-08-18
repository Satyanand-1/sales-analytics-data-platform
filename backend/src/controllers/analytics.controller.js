const analyticsService = require('../services/analytics.service');

const getRevenue = async (req, res, next) => {
  try {
    const data = await analyticsService.getRevenueSummary();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getSalesByProduct = async (req, res, next) => {
  try {
    const data = await analyticsService.getSalesByProduct();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getSalesByCity = async (req, res, next) => {
  try {
    const data = await analyticsService.getSalesByCity();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getDailySales = async (req, res, next) => {
  try {
    const data = await analyticsService.getDailySales();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRevenue,
  getSalesByProduct,
  getSalesByCity,
  getDailySales
};
