const dotenv = require('dotenv');
const path = require('path');

// Load env variables from root .env if it exists
dotenv.config({ path: path.join(__dirname, '../../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // PostgreSQL (for future use)
  POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: process.env.POSTGRES_PORT || 5432,
  POSTGRES_DB: process.env.POSTGRES_DB || 'sales_operational',
  POSTGRES_USER: process.env.POSTGRES_USER || 'sales_user',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'sales_password_123',

  // MinIO (for future use)
  MINIO_HOST: process.env.MINIO_HOST || 'localhost',
  MINIO_PORT: process.env.MINIO_PORT || 9000,
  MINIO_ROOT_USER: process.env.MINIO_ROOT_USER || 'minio_admin',
  MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD || 'minio_password_123',
};
