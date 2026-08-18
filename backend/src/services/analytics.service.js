const { queryDuckDb } = require('../config/db');

/**
 * Get summary revenue statistics (Total Revenue, Total Units Sold, Total Orders, Average Order Value)
 */
const getRevenueSummary = async () => {
  const sql = `
    SELECT 
      CAST(SUM(revenue) AS DOUBLE) AS totalRevenue,
      CAST(SUM(quantity) AS INTEGER) AS totalUnitsSold,
      CAST(COUNT(DISTINCT order_id) AS INTEGER) AS totalOrders,
      CAST(SUM(revenue) / COUNT(DISTINCT order_id) AS DOUBLE) AS averageOrderValue
    FROM fact_sales;
  `;
  const rows = await queryDuckDb(sql);
  return rows[0];
};

/**
 * Get sales aggregates grouped by product
 */
const getSalesByProduct = async () => {
  const sql = `
    SELECT 
      p.name AS productName,
      p.category AS category,
      CAST(SUM(f.quantity) AS INTEGER) AS totalUnits,
      CAST(SUM(f.revenue) AS DOUBLE) AS totalRevenue
    FROM fact_sales f
    JOIN dim_product p ON f.product_id = p.product_id
    GROUP BY p.name, p.category
    ORDER BY totalRevenue DESC;
  `;
  return queryDuckDb(sql);
};

/**
 * Get sales aggregates grouped by customer city
 */
const getSalesByCity = async () => {
  const sql = `
    SELECT 
      c.city AS city,
      CAST(COUNT(DISTINCT f.order_id) AS INTEGER) AS totalOrders,
      CAST(SUM(f.quantity) AS INTEGER) AS totalUnits,
      CAST(SUM(f.revenue) AS DOUBLE) AS totalRevenue
    FROM fact_sales f
    JOIN dim_customer c ON f.customer_id = c.customer_id
    GROUP BY c.city
    ORDER BY totalRevenue DESC;
  `;
  return queryDuckDb(sql);
};

/**
 * Get daily sales aggregates (time series)
 */
const getDailySales = async () => {
  const sql = `
    SELECT 
      CAST(f.sale_date AS DATE) AS date,
      CAST(COUNT(DISTINCT f.order_id) AS INTEGER) AS totalOrders,
      CAST(SUM(f.revenue) AS DOUBLE) AS totalRevenue
    FROM fact_sales f
    GROUP BY date
    ORDER BY date ASC;
  `;
  return queryDuckDb(sql);
};

module.exports = {
  getRevenueSummary,
  getSalesByProduct,
  getSalesByCity,
  getDailySales
};
