const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { queryDuckDb, setPipelineActive } = require('../config/db');

// In-memory state tracking
const pipelineState = {
  status: 'idle',
  progressMessage: 'Pipeline is idle.',
  startedAt: null,
  completedAt: null,
  lastSuccessfulRun: null,
  error: null,
  recordCounts: {
    customers: null,
    products: null,
    orders: null,
    orderItems: null,
    dim_customer: null,
    dim_product: null,
    fact_sales: null
  }
};

// In-memory locking mechanism (Protects a single Node.js process only)
let isRunning = false;

/**
 * Resolves the path to the Python executable, checking for virtual environment binaries
 * or system paths (Windows & Linux compatible).
 */
function getPythonExecutable() {
  const rootDir = path.join(__dirname, '../../..');
  const winVenv = path.join(rootDir, '.venv', 'Scripts', 'python.exe');
  const unixVenv = path.join(rootDir, '.venv', 'bin', 'python');

  if (fs.existsSync(winVenv)) {
    return winVenv;
  }
  if (fs.existsSync(unixVenv)) {
    return unixVenv;
  }
  
  // Return 'python' and assume it exists on PATH (will try python3 if it fails)
  return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Runs a python script using child_process.spawn.
 * Returns a Promise that resolves on successful exit code 0 or rejects on error.
 */
function executeScript(pythonPath, scriptPath, onLine) {
  return new Promise((resolve, reject) => {
    console.log(`Spawning process: ${pythonPath} ${scriptPath}`);
    const child = spawn(pythonPath, [scriptPath], {
      cwd: path.join(__dirname, '../../..'),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    let outputBuffer = '';
    let errorBuffer = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      outputBuffer += chunk;
      
      // Split by lines and trigger callback
      const lines = chunk.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) onLine(trimmed, false);
      });
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorBuffer += chunk;
      
      const lines = chunk.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) onLine(trimmed, true);
      });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(outputBuffer);
      } else {
        reject({
          code,
          message: errorBuffer.trim() || outputBuffer.trim() || `Process exited with code ${code}`
        });
      }
    });

    child.on('error', (err) => {
      reject({
        code: -1,
        message: err.message || 'Failed to start child process'
      });
    });
  });
}

/**
 * Helper to parse record counts from extraction stdout log lines.
 * Robust regex mapping that handles variable whitespace.
 */
function parseExtractionCounts(line) {
  const counts = {};
  // Example line: "Extracted   150 rows from 'customers' -> uploaded..."
  const match = line.match(/Extracted\s+(\d+)\s+rows from '(\w+)'/i);
  if (match) {
    const count = parseInt(match[1], 10);
    const table = match[2];
    
    if (table === 'customers') counts.customers = count;
    else if (table === 'products') counts.products = count;
    else if (table === 'orders') counts.orders = count;
    else if (table === 'order_items') counts.orderItems = count;
  }
  return counts;
}

/**
 * Executes the PostgreSQL -> MinIO -> DuckDB data pipeline in the background.
 */
async function runPipeline() {
  if (isRunning) {
    throw new Error('Pipeline is already running.');
  }

  isRunning = true;
  setPipelineActive(true);
  pipelineState.status = 'running';
  pipelineState.progressMessage = 'Acquired process lock. Initializing pipeline...';
  pipelineState.startedAt = new Date().toISOString();
  pipelineState.completedAt = null;
  pipelineState.error = null;
  
  // Reset active run record counts
  pipelineState.recordCounts = {
    customers: null,
    products: null,
    orders: null,
    orderItems: null,
    dim_customer: null,
    dim_product: null,
    fact_sales: null
  };

  // Launch background job asynchronously
  (async () => {
    try {
      const pythonPath = getPythonExecutable();
      const rootDir = path.join(__dirname, '../../..');
      const extractScript = path.join(rootDir, 'etl', 'extract.py');
      const transformScript = path.join(rootDir, 'etl', 'transform.py');

      // --- STEP 1: PostgreSQL -> MinIO Ingestion ---
      pipelineState.progressMessage = 'Running Ingestion: Extracting operational tables from PostgreSQL...';
      
      await executeScript(pythonPath, extractScript, (line, isStderr) => {
        if (!isStderr) {
          try {
            const parsed = parseExtractionCounts(line);
            pipelineState.recordCounts = { ...pipelineState.recordCounts, ...parsed };
          } catch (e) {
            console.error('Error parsing extraction counts from log:', e);
          }
        }
      });

      // --- STEP 2: MinIO -> DuckDB Analytical Loading ---
      pipelineState.progressMessage = 'Running Transformations: Loading and partitioning tables in DuckDB...';
      
      await executeScript(pythonPath, transformScript, (line) => {
        console.log(`[Transform] ${line}`);
        
        // Parse warehouse record counts from transform output logs
        try {
          const dimCustMatch = line.match(/Table 'dim_customer': (\d+) records loaded/);
          if (dimCustMatch) {
            pipelineState.recordCounts.dim_customer = parseInt(dimCustMatch[1], 10);
          }
          
          const dimProdMatch = line.match(/Table 'dim_product': (\d+) records loaded/);
          if (dimProdMatch) {
            pipelineState.recordCounts.dim_product = parseInt(dimProdMatch[1], 10);
          }
          
          const factSalesMatch = line.match(/Table 'fact_sales': (\d+) records loaded/);
          if (factSalesMatch) {
            pipelineState.recordCounts.fact_sales = parseInt(factSalesMatch[1], 10);
          }
        } catch (e) {
          console.error('Error parsing transform counts from log:', e);
        }
      });

      // Transformation complete! Enable DuckDB queries again
      setPipelineActive(false);

      // Success completion
      const nowStr = new Date().toISOString();
      pipelineState.status = 'success';
      pipelineState.progressMessage = 'Pipeline execution completed successfully!';
      pipelineState.completedAt = nowStr;
      pipelineState.lastSuccessfulRun = nowStr;

    } catch (err) {
      console.error('Data pipeline execution failed:', err);
      
      pipelineState.status = 'failed';
      pipelineState.progressMessage = 'Pipeline execution failed.';
      pipelineState.completedAt = new Date().toISOString();
      
      // Expose the error information details
      pipelineState.error = {
        message: err.message || 'An unexpected error occurred during execution.',
        step: pipelineState.progressMessage
      };
    } finally {
      setPipelineActive(false);
      isRunning = false;
    }
  })();
}

function getPipelineState() {
  return { ...pipelineState };
}

module.exports = {
  runPipeline,
  getPipelineState
};
