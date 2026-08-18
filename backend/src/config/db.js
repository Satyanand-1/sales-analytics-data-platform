const duckdb = require('duckdb');
const path = require('path');

const dbPath = path.join(__dirname, '../../../data/sales_warehouse.db');

// Initialize DuckDB Database
const db = new duckdb.Database(dbPath);

/**
 * Execute a SQL query on the DuckDB analytical warehouse.
 * Wraps the callback-based db.all in a Promise.
 */
const queryDuckDb = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
};

const postgresClient = {
  status: 'DISCONNECTED',
  connect: async () => {
    console.log('PostgreSQL client placeholder (no connection active)');
  }
};

module.exports = {
  queryDuckDb,
  postgresClient
};
