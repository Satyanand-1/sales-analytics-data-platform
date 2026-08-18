const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Routes mount
app.use('/api', healthRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({
    status: 'ERROR',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start Server
app.listen(env.PORT, () => {
  console.log(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});
