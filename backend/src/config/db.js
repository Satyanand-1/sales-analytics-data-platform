const duckdb = require('duckdb');
const { Pool } = require('pg');
const path = require('path');
const env = require('./env');

const dbPath = path.join(__dirname, '../../../data/sales_warehouse.db');

// Sequential Query Queue to prevent concurrent DuckDB database file openings in Node.js
let queryQueue = Promise.resolve();

// Active pipeline runner status flag
let pipelineActive = false;

const setPipelineActive = (active) => {
  pipelineActive = !!active;
  console.log(`DuckDB access pipelineActive status shifted to: ${pipelineActive}`);
};

/**
 * Execute a SQL query on the DuckDB analytical warehouse.
 * Opens and closes the database connection on demand to release file locks.
 * Queues requests sequentially and retries on lock contention to handle OS latency.
 */
const queryDuckDb = (sql, params = []) => {
  if (pipelineActive) {
    return Promise.reject(new Error('DuckDB database is offline (pipeline execution in progress).'));
  }

  const executeQuery = () => {
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 200;

    const tryOpenAndExecute = (resolve, reject) => {
      attempts++;
      const db = new duckdb.Database(dbPath, (err) => {
        if (err) {
          // CRITICAL: Explicitly close the failed db instance to release any partially allocated OS file locks!
          try {
            db.close(() => {});
          } catch (closeErr) {
            console.error('Error closing failed DuckDB instance:', closeErr);
          }

          const isLocked = err.message && (
            err.message.includes('IO Error') || 
            err.message.includes('used by another process') ||
            err.message.includes('locked')
          );
          if (isLocked && attempts < maxAttempts) {
            console.log(`DuckDB file locked. Retrying query attempt ${attempts}/${maxAttempts} in ${delay}ms...`);
            setTimeout(() => tryOpenAndExecute(resolve, reject), delay);
            return;
          }
          return reject(err);
        }
        
        db.all(sql, ...params, (queryErr, rows) => {
          db.close((closeErr) => {
            if (closeErr) {
              console.error('Error closing DuckDB database connection:', closeErr);
            }
            if (queryErr) {
              return reject(queryErr);
            }
            resolve(rows);
          });
        });
      });
    };

    return new Promise((resolve, reject) => {
      tryOpenAndExecute(resolve, reject);
    });
  };

  // Chain query to the queue with a 50ms buffer delay between queries to let the OS release file descriptors
  const resultPromise = queryQueue.then(
    () => new Promise((r) => setTimeout(r, 50)).then(executeQuery),
    () => new Promise((r) => setTimeout(r, 50)).then(executeQuery)
  );
  queryQueue = resultPromise.catch(() => {}); // Keep queue running on failure
  return resultPromise;
};

// Initialize PostgreSQL Pool
const pgPool = new Pool({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  database: env.POSTGRES_DB,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
});

// Test connection on startup
pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Execute a SQL query on the PostgreSQL operational database.
 */
const queryPostgres = (sql, params = []) => {
  return pgPool.query(sql, params);
};

module.exports = {
  queryDuckDb,
  pgPool,
  queryPostgres,
  setPipelineActive
};
