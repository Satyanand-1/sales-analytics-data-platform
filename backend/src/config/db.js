// Placeholders for database clients (PostgreSQL / DuckDB)
// Connection logic will be implemented in later stages.

const env = require('./env');

const postgresClient = {
  status: 'DISCONNECTED',
  connect: async () => {
    console.log('PostgreSQL client placeholder (no connection active)');
  }
};

const duckDbClient = {
  status: 'DISCONNECTED',
  connect: async () => {
    console.log('DuckDB client placeholder (no connection active)');
  }
};

module.exports = {
  postgresClient,
  duckDbClient
};
