const duckdb = require('duckdb');
const path = require('path');

const dbPath = path.join(__dirname, '../../../data/sales_warehouse.db');

let db = null;

/**
 * Opens the persistent DuckDB connection.
 */
const connectDb = () => {
  if (!db) {
    db = new duckdb.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open DuckDB database:', err);
      } else {
        console.log('DuckDB database connection opened successfully.');
      }
    });
  }
};

/**
 * Closes the persistent DuckDB connection and releases the file lock.
 * Returns a Promise that resolves when the connection is closed.
 */
const disconnectDb = () => {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing DuckDB database:', err);
        } else {
          console.log('DuckDB database connection closed successfully.');
        }
        db = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
};

// Initialize DuckDB connection on backend start
connectDb();

/**
 * Execute a SQL query on the DuckDB analytical warehouse.
 * Wraps the callback-based db.all in a Promise.
 */
const queryDuckDb = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject(new Error('DuckDB database is offline (pipeline execution in progress).'));
    }
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
  connectDb,
  disconnectDb,
  postgresClient
};
