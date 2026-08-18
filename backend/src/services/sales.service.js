const { pgPool } = require('../config/db');

/**
 * Validates email address format.
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Gets all customers ordered by name.
 */
const getCustomers = async () => {
  const res = await pgPool.query(
    'SELECT customer_id, first_name, last_name, email, phone, city, created_at FROM customers ORDER BY first_name ASC, last_name ASC;'
  );
  return res.rows;
};

/**
 * Creates a new customer with input validation.
 */
const createCustomer = async ({ first_name, last_name, email, phone, city }) => {
  if (!first_name || !first_name.trim()) throw new Error('First name is required.');
  if (!last_name || !last_name.trim()) throw new Error('Last name is required.');
  if (!email || !email.trim()) throw new Error('Email is required.');
  if (!isValidEmail(email)) throw new Error('Invalid email address format.');
  if (!city || !city.trim()) throw new Error('City is required.');

  // Validate email uniqueness in PostgreSQL
  const checkEmail = await pgPool.query('SELECT customer_id FROM customers WHERE email = $1;', [email.trim()]);
  if (checkEmail.rowCount > 0) {
    throw new Error(`A customer with email '${email}' already exists.`);
  }

  const res = await pgPool.query(
    'INSERT INTO customers (first_name, last_name, email, phone, city) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
    [first_name.trim(), last_name.trim(), email.trim(), phone ? phone.trim() : null, city.trim()]
  );
  return res.rows[0];
};

/**
 * Gets all products.
 */
const getProducts = async () => {
  const res = await pgPool.query(
    'SELECT product_id, name, sku, category, price, created_at FROM products ORDER BY name ASC;'
  );
  return res.rows;
};

/**
 * Creates a new product with input validation.
 */
const createProduct = async ({ name, sku, category, price }) => {
  if (!name || !name.trim()) throw new Error('Product name is required.');
  if (!sku || !sku.trim()) throw new Error('Product SKU is required.');
  if (!category || !category.trim()) throw new Error('Product category is required.');
  if (price === undefined || price === null) throw new Error('Price is required.');
  
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    throw new Error('Price must be a number greater than or equal to 0.');
  }

  // Validate SKU uniqueness
  const checkSku = await pgPool.query('SELECT product_id FROM products WHERE sku = $1;', [sku.trim()]);
  if (checkSku.rowCount > 0) {
    throw new Error(`A product with SKU '${sku}' already exists.`);
  }

  const res = await pgPool.query(
    'INSERT INTO products (name, sku, category, price) VALUES ($1, $2, $3, $4) RETURNING *;',
    [name.trim(), sku.trim(), category.trim(), parsedPrice]
  );
  return res.rows[0];
};

/**
 * Gets all orders with joined customer details and item counts.
 */
const getOrders = async () => {
  const res = await pgPool.query(`
    SELECT 
      o.order_id,
      o.order_date,
      (c.first_name || ' ' || c.last_name) AS customer_name,
      c.email AS customer_email,
      c.city AS customer_city,
      o.status,
      o.total_amount,
      COUNT(oi.order_item_id)::integer AS item_count
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    GROUP BY o.order_id, c.customer_id
    ORDER BY o.order_date DESC, o.order_id DESC;
  `);
  return res.rows;
};

/**
 * Creates a new order and inserts order_items inside one PostgreSQL transaction.
 * Authoritatively calculates unit price and totals on the backend.
 */
const createOrder = async ({ customer_id, order_date, status, items }) => {
  // Validate items list
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order items list is required and cannot be empty.');
  }

  // Validate duplicate product_id values
  const productIdsSet = new Set();
  for (const item of items) {
    if (!item.product_id) {
      throw new Error('Each order item must specify a product_id.');
    }
    if (productIdsSet.has(item.product_id)) {
      throw new Error(`Duplicate product_id ${item.product_id} in single order is rejected.`);
    }
    productIdsSet.add(item.product_id);
  }

  // Validate status values
  const parsedStatus = status || 'Pending';
  const statusValues = ['Pending', 'Processing', 'Completed', 'Cancelled', 'Refunded'];
  if (!statusValues.includes(parsedStatus)) {
    throw new Error(`Invalid status: ${parsedStatus}. Status must be one of: ${statusValues.join(', ')}`);
  }

  // Validate order_date if provided
  let parsedDate = null;
  if (order_date) {
    parsedDate = new Date(order_date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid order_date timestamp format.');
    }
  }

  // Execute database operations inside a PostgreSQL transaction client
  const client = await pgPool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Verify customer exists
    const custRes = await client.query('SELECT customer_id FROM customers WHERE customer_id = $1;', [customer_id]);
    if (custRes.rowCount === 0) {
      throw new Error(`Customer with ID ${customer_id} does not exist.`);
    }

    // 2. Fetch prices of all specified products to prevent client price spoofing
    const productIdsArray = Array.from(productIdsSet);
    const prodRes = await client.query('SELECT product_id, price FROM products WHERE product_id = ANY($1);', [productIdsArray]);
    
    const productMap = new Map();
    prodRes.rows.forEach(p => productMap.set(p.product_id, parseFloat(p.price)));

    // 3. Validate product exists & quantity is valid integer > 0
    let totalAmount = 0;
    const orderItemsToInsert = [];

    for (const item of items) {
      if (!productMap.has(item.product_id)) {
        throw new Error(`Product with ID ${item.product_id} does not exist in the database.`);
      }
      
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(Number(item.quantity))) {
        throw new Error(`Quantity for product ID ${item.product_id} must be an integer greater than 0.`);
      }

      const unitPrice = productMap.get(item.product_id);
      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      orderItemsToInsert.push({
        product_id: item.product_id,
        quantity,
        unit_price: unitPrice,
        subtotal
      });
    }

    // 4. Insert order record
    let orderQuery;
    let orderParams;

    if (parsedDate) {
      orderQuery = `INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES ($1, $2, $3, $4) RETURNING order_id;`;
      orderParams = [customer_id, parsedDate, parsedStatus, totalAmount];
    } else {
      orderQuery = `INSERT INTO orders (customer_id, status, total_amount) VALUES ($1, $2, $3) RETURNING order_id;`;
      orderParams = [customer_id, parsedStatus, totalAmount];
    }

    const orderInsertRes = await client.query(orderQuery, orderParams);
    const orderId = orderInsertRes.rows[0].order_id;

    // 5. Insert order items records
    for (const item of orderItemsToInsert) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5);`,
        [orderId, item.product_id, item.quantity, item.unit_price, item.subtotal]
      );
    }

    await client.query('COMMIT');
    
    return {
      order_id: orderId,
      customer_id,
      order_date: parsedDate || new Date().toISOString(),
      status: parsedStatus,
      total_amount: totalAmount,
      item_count: orderItemsToInsert.length
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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
