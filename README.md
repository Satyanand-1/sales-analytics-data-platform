# Sales Analytics Data Platform

An end-to-end Sales Analytics & Data Engineering Platform that connects operational PostgreSQL transactions through a Python ETL pipeline to a DuckDB analytical warehouse, surfaced through Express APIs and a React dashboard. The platform supports both real-time operational sales management (customer, product, and order creation) and analytical reporting (revenue KPIs, daily trends, product rankings, and city breakdowns).

```
Operational Flow:          Analytical Flow:

React Dashboard            PostgreSQL
      ↓                        ↓
Express APIs               extract.py (Python)
      ↓                        ↓
PostgreSQL                 Parquet files
                               ↓
                           MinIO (S3-compatible)
                               ↓
                           transform.py (Python)
                               ↓
                           DuckDB Warehouse
                               ↓
                           Express Analytics APIs
                               ↓
                           React Dashboard
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Host Browser                                  │
│                                                                          │
│   http://localhost:5173 (Frontend)    http://localhost:5001 (Backend)    │
└──────────┬─────────────────────────────────────┬─────────────────────────┘
           │                                     │
┌──────────▼──────────────┐   ┌──────────────────▼─────────────────────────┐
│   Nginx (Frontend)      │   │   Node.js + Express (Backend)              │
│   React + TypeScript    │   │                                            │
│   Vite + Recharts       │   │   ┌────────────────┐  ┌────────────────┐  │
│   Static SPA            │   │   │ Analytics APIs │  │ Sales Mgmt APIs│  │
└─────────────────────────┘   │   └───────┬────────┘  └───────┬────────┘  │
                              │           │                    │           │
                              │   ┌───────▼────────┐  ┌───────▼────────┐  │
                              │   │   DuckDB       │  │   PostgreSQL   │  │
                              │   │   (Warehouse)  │  │   (Operational)│  │
                              │   └────────────────┘  └────────────────┘  │
                              │                                            │
                              │   ┌────────────────────────────────────┐   │
                              │   │   Python ETL (child_process)       │   │
                              │   │   extract.py → MinIO → transform.py│  │
                              │   └────────────────────────────────────┘   │
                              └────────────────────────────────────────────┘
```

**Component Responsibilities:**

| Component | Responsibility |
|---|---|
| **React + TypeScript** | Dashboard UI, KPI cards, charts, forms, order management |
| **Vite** | Frontend build tooling and development server |
| **Recharts** | SVG chart rendering (area charts, horizontal bar charts) |
| **Node.js + Express** | REST API server, business logic, ETL orchestration |
| **PostgreSQL** | Operational transactional database (customers, products, orders) |
| **Python ETL** | Data extraction, Parquet generation, warehouse transformation |
| **MinIO** | S3-compatible object storage for raw Parquet data lake |
| **DuckDB** | Columnar analytical warehouse for aggregation queries |
| **Nginx** | Production static file server for compiled React assets |
| **Docker Compose** | Multi-container orchestration |

---

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- Axios
- Recharts
- CSS

### Backend
- Node.js
- Express
- pg (PostgreSQL client)
- DuckDB (Node.js bindings)

### Data Engineering
- Python 3
- Pandas
- PyArrow
- Apache Parquet
- DuckDB (Python bindings)
- Boto3
- psycopg2

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 15 (Alpine)
- MinIO (S3-compatible object storage)
- Nginx 1.25 (Alpine)

---

## Implemented Features

### Analytics Dashboard

The dashboard provides four KPI summary cards:

- **Total Revenue** — Aggregate revenue across all orders
- **Total Orders** — Distinct order count using `COUNT(DISTINCT order_id)`
- **Total Units Sold** — Sum of all quantities across order items
- **Average Order Value** — Revenue divided by distinct order count

Each dashboard section (KPIs, daily sales, product analytics, city analytics) loads independently with its own loading spinner, error message, and retry button. A failure in one section does not affect the others.

### Daily Sales Trend

An interactive Recharts `AreaChart` displaying daily revenue over time:

- **X-Axis**: Dates formatted as `DD MMM` (e.g., `15 Jan`)
- **Y-Axis**: Revenue formatted in Indian shorthand (e.g., `₹5L`, `₹15L`, `₹500K`)
- **Tooltip**: Displays the exact date, formatted revenue in Indian Rupees (₹), and order count on hover
- **Gradient fill**: Blue-to-transparent area fill beneath the trend line
- **Responsive**: Adapts to container width using `ResponsiveContainer`

### Product Analytics

Product performance visualization with two components:

- **Top 10 Revenue Bar Chart**: Horizontal bar chart showing the top 10 products ranked by total revenue, rendered with Recharts
- **Full Product Ranking Table**: Scrollable table displaying all 30 products with columns for rank, product name, category, units sold, and total revenue, sorted by revenue descending

### City Analytics

Revenue distribution across 9 operational Indian cities:

- **City Revenue Bar Chart**: Horizontal bar chart showing all 9 cities sorted by total revenue descending, with an interactive tooltip displaying city name, total revenue, total orders, and total units
- **City Details Table**: Table showing all 9 cities with columns for city, total orders, total units, and total revenue, sorted by revenue descending

### Sales Management

Operational CRUD interface for managing sales data:

- **Customer Creation** — Form with first name, last name, email, and city fields with validation
- **Customer Listing** — Displays all customers from PostgreSQL
- **Product Creation** — Form with product name, category, SKU, and price with SKU uniqueness validation and price >= 0 enforcement
- **Product Listing** — Displays all products from PostgreSQL
- **Sales Order Creation** — Dynamic form with customer selection, multiple product line items (add/remove rows), quantity input, and a running total calculated from product catalog prices
- **Order History** — Table displaying all orders with timestamps, customer information, item counts, statuses, and totals

**Backend-authoritative pricing**: The order form displays a running total using product prices fetched from the backend, but the backend recalculates the final total using authoritative PostgreSQL product prices. Client-supplied prices are never trusted.

**Transactional order creation**: Orders are created inside a PostgreSQL transaction using a dedicated pool client with `BEGIN`, `COMMIT`, and `ROLLBACK` on failure. Duplicate `product_id` values within a single order are rejected. Customer and product existence are validated before insertion.

---

## Data Pipeline

The **Run Data Pipeline** button triggers the complete ETL process from the dashboard:

```
PostgreSQL (Operational)
        ↓
   extract.py
        ↓
   Parquet files
        ↓
   MinIO (Raw Data Lake)
        ↓
   transform.py
        ↓
   DuckDB (Warehouse)
        ↓
   Analytics APIs
        ↓
   Dashboard refresh
```

**Pipeline steps:**

1. **Extract** — `extract.py` connects to PostgreSQL, reads operational tables (customers, products, orders, order_items), converts them to Parquet format using PyArrow, and uploads them to MinIO
2. **Transform** — `transform.py` reads Parquet files from MinIO using DuckDB's S3/httpfs extension, builds dimension tables (`dim_customer`, `dim_product`) and the fact table (`fact_sales`), and writes them to the DuckDB warehouse
3. **Refresh** — After successful completion, the dashboard automatically re-fetches all analytical data

**Pipeline states:**

| State | Description |
|---|---|
| `idle` | No pipeline running |
| `running` | Pipeline is actively executing |
| `success` | Pipeline completed successfully |
| `failed` | Pipeline encountered an error |

**Pipeline features:**

- Background execution via Node.js `child_process.spawn`
- Real-time progress messages (e.g., *Extracting operational tables...*, *Transforming warehouse data...*)
- Start and completion timestamps
- Record counts for each table processed
- Error reporting with failed step identification
- Concurrent execution protection (in-memory lock prevents multiple simultaneous runs)
- Dashboard analytics refresh only on successful completion

---

## Data Warehouse

The DuckDB analytical warehouse contains three tables built by the transformation pipeline:

### dim_customer

| Column | Type | Description |
|---|---|---|
| customer_id | BIGINT | Primary key |
| name | VARCHAR | Concatenated first_name and last_name |
| city | VARCHAR | Customer city |
| created_at | TIMESTAMP WITH TIME ZONE | Account creation date |

### dim_product

| Column | Type | Description |
|---|---|---|
| product_id | BIGINT | Primary key |
| name | VARCHAR | Product name |
| category | VARCHAR | Product category |
| price | DOUBLE | Product unit price |

### fact_sales

| Column | Type | Description |
|---|---|---|
| sale_id | BIGINT | Unique sale identifier |
| order_id | BIGINT | Order reference (used with `COUNT(DISTINCT order_id)` for order counts) |
| customer_id | BIGINT | Customer dimension key |
| product_id | BIGINT | Product dimension key |
| quantity | BIGINT | Units sold |
| revenue | DOUBLE | Line item revenue (quantity × unit_price) |
| sale_date | TIMESTAMP WITH TIME ZONE | Transaction date |

---

## Data Validation

### PostgreSQL vs DuckDB Cross-System Verification

| Metric | PostgreSQL (Source) | DuckDB (Warehouse) | Result |
|---|---|---|---|
| Total Revenue | 100,192,297.00 | 100,192,297.00 | ✅ Match |
| Total Orders | 1,000 | 1,000 | ✅ Match |
| Total Quantity | 6,218 | 6,218 | ✅ Match |

This validates that revenue, order counts, and quantities are fully preserved through the ETL pipeline from the operational database to the analytical warehouse.

### Validated Dataset

| Entity | Count |
|---|---|
| Customers | 150 |
| Products | 30 |
| Orders | 1,000 |
| Order Items | 2,041 |
| Cities | 9 |

### Operational Test Verification

After creating an additional customer, product, and order through the Sales Management interface and re-running the pipeline:

| Entity | Before | After |
|---|---|---|
| Customers | 150 | 151 |
| Products | 30 | 31 |
| Orders | 1,000 | 1,001 |
| Order Items | 2,041 | 2,042 |
| DuckDB fact_sales | 2,041 | 2,042 |

---

## API Endpoints

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend health status |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/revenue` | KPI summary (revenue, orders, units, AOV) |
| GET | `/api/analytics/sales-by-product` | Product sales rankings |
| GET | `/api/analytics/sales-by-city` | City sales breakdown |
| GET | `/api/analytics/daily-sales` | Daily revenue time series |

### Pipeline

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pipeline/status` | Current pipeline execution state |
| POST | `/api/pipeline/run` | Trigger pipeline execution (returns 202 Accepted) |

### Customers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customers` | List all customers |
| POST | `/api/customers` | Create a new customer |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create a new product |

### Orders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/orders` | List all orders with details |
| POST | `/api/orders` | Create a new order with line items |

---

## Docker Architecture

The platform runs as four Docker services orchestrated by Docker Compose:

| Container | Image | Port | Healthcheck |
|---|---|---|---|
| `sales-postgres` | `postgres:15-alpine` | 5432 | `pg_isready` |
| `sales-minio` | `minio/minio` | 9000, 9001 | `curl /minio/health/live` |
| `sales-backend` | Custom (Node.js + Python) | 5001 | `curl /api/health` |
| `sales-frontend` | Custom (Nginx) | 5173 → 80 | — |

**Volumes:**

| Volume | Mount Point | Purpose |
|---|---|---|
| `postgres_data` | `/var/lib/postgresql/data` | PostgreSQL data persistence |
| `minio_data` | `/data` | MinIO object storage persistence |
| `duckdb_data` | `/app/data` | DuckDB warehouse file persistence |

**Networking:**

- Backend connects to PostgreSQL using the Docker service name: `db:5432`
- Backend connects to MinIO using the Docker service name: `minio:9000`
- The browser connects to the backend through the host-exposed port: `http://localhost:5001`
- The frontend is served through Nginx at: `http://localhost:5173`

**Why DuckDB uses a named Docker volume:**

DuckDB requires exclusive file locks for write operations. On Windows with Docker Desktop, bind-mounting the database file to the host filesystem introduces latency in the host-to-VM file system layer, causing timing delays and locking conflicts. Storing DuckDB inside a named Docker volume keeps the file on the Linux VM's native ext4 filesystem, completely bypassing Windows host filesystem synchronization issues.

**Backend container:**

The backend container is built on `node:20-bookworm-slim` (Debian) and includes both the Node.js runtime and a Python 3 virtual environment at `/app/.venv` with all ETL dependencies (Pandas, PyArrow, Boto3, psycopg2, DuckDB). This allows the Express server to execute `extract.py` and `transform.py` via `child_process.spawn` without requiring a separate Python container.

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### Clone and Start

```bash
git clone https://github.com/Satyanand-1/sales-analytics-data-platform.git
cd sales-analytics-data-platform
```

Create a `.env` file in the project root with the required environment variables (see [Environment Configuration](#environment-configuration)).

Build and start all services:

```bash
docker compose up -d --build
```

Verify all containers are running and healthy:

```bash
docker compose ps
```

### Seed the Database

On a fresh `postgres_data` volume, seed PostgreSQL with operational data:

```bash
docker compose exec backend /app/.venv/bin/python /app/etl/generate_data.py
```

### Run the Pipeline

Open the dashboard at `http://localhost:5173`, navigate to the **Analytics Overview** tab, and click **Run Data Pipeline** to execute the ETL process and populate the analytical warehouse.

---

## Environment Configuration

Docker Compose reads environment variables from a `.env` file in the project root. Create this file with the following variables:

```env
POSTGRES_DB=<database_name>
POSTGRES_USER=<database_user>
POSTGRES_PASSWORD=<database_password>
POSTGRES_PORT=5432

MINIO_ROOT_USER=<minio_access_key>
MINIO_ROOT_PASSWORD=<minio_secret_key>
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
```

> **Note:** The `.env` file is excluded from both Git (via `.gitignore`) and Docker build contexts (via `.dockerignore`). All configuration is injected into containers through Docker Compose environment variables.

---

## Application URLs

| Service | URL |
|---|---|
| Frontend Dashboard | http://localhost:5173 |
| Backend API | http://localhost:5001 |
| MinIO Console | http://localhost:9001 |

---

## Useful Docker Commands

```bash
# Start all services
docker compose up -d

# Build and start all services
docker compose up -d --build

# Stop all services (preserves volumes)
docker compose down

# Check service status and health
docker compose ps

# View backend logs
docker compose logs backend

# Follow backend logs in real time
docker compose logs -f backend

# Restart a specific service
docker compose restart backend
```

> **Note:** `docker compose down` stops and removes containers but does **not** delete named volumes. PostgreSQL data, MinIO objects, and the DuckDB warehouse persist across restarts.

---

## Project Structure

```
sales-analytics-data-platform/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connections (PostgreSQL + DuckDB)
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic and data access
│   │   └── index.js         # Express server entry point
│   ├── Dockerfile           # Node.js + Python backend image
│   └── package.json
├── etl/
│   ├── extract.py           # PostgreSQL → Parquet → MinIO
│   ├── transform.py         # MinIO → DuckDB warehouse
│   ├── generate_data.py     # PostgreSQL seed data generator
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Dashboard and Sales Management views
│   │   ├── services/        # Axios API client
│   │   └── types/           # TypeScript interfaces
│   ├── Dockerfile           # Multi-stage Vite build → Nginx
│   ├── nginx.conf           # Nginx SPA configuration
│   └── package.json
├── database/
│   └── schema.sql           # PostgreSQL schema initialization
├── docs/
│   └── data_warehouse_spec.md
├── .dockerignore
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## Engineering Decisions

1. **PostgreSQL for operational workloads** — ACID-compliant relational database for transactional sales data with foreign key constraints and referential integrity.

2. **DuckDB for analytical workloads** — Columnar, embedded analytical database optimized for aggregation queries. Runs in-process without a separate server.

3. **MinIO for raw Parquet object storage** — S3-compatible data lake layer decoupling the extraction and transformation stages. Raw data is preserved in Parquet format for auditability.

4. **Backend-authoritative product pricing** — Order totals are calculated on the backend using current PostgreSQL product prices. Client-supplied prices are never trusted, preventing price manipulation.

5. **PostgreSQL transactional order creation** — Orders and order items are inserted inside a single `BEGIN`/`COMMIT` transaction with `ROLLBACK` on failure, ensuring atomicity.

6. **Background ETL execution through Node.js child processes** — Python ETL scripts are executed via `child_process.spawn` from the Express backend, allowing the API server to trigger and monitor pipeline runs without a separate orchestration service.

7. **Pipeline concurrency protection** — An in-memory lock prevents multiple simultaneous pipeline executions within the same Node.js process.

8. **DuckDB lock management** — A sequential promise queue serializes DuckDB connections. Analytics queries are blocked during active pipeline runs to prevent file lock contention.

9. **Independent dashboard section loading** — Each dashboard section (KPIs, daily sales, products, cities) loads independently with its own loading/error/retry state. A failure in one section does not break the others.

10. **PostgreSQL/DuckDB cross-system validation** — Revenue, order counts, and quantities were verified to match exactly between the operational database and the analytical warehouse, confirming ETL pipeline integrity.

---

## Verification

The following were verified during development and testing:

- ✅ PostgreSQL schema initialization and data seeding
- ✅ MinIO bucket creation and Parquet storage
- ✅ DuckDB warehouse table creation
- ✅ ETL extraction (PostgreSQL → Parquet → MinIO)
- ✅ ETL transformation (MinIO → DuckDB)
- ✅ Analytics APIs (revenue, products, cities, daily sales)
- ✅ KPI dashboard rendering
- ✅ Daily Sales area chart with tooltips
- ✅ Product analytics (bar chart + ranking table)
- ✅ City analytics (bar chart + details table)
- ✅ Customer creation and listing
- ✅ Product creation with SKU validation
- ✅ Sales order creation with backend pricing
- ✅ PostgreSQL transaction rollback on failure
- ✅ Duplicate product_id rejection in orders
- ✅ Pipeline execution from dashboard
- ✅ Pipeline status polling and progress display
- ✅ Pipeline concurrency protection
- ✅ Pipeline failure handling and error reporting
- ✅ PostgreSQL/DuckDB cross-system data validation
- ✅ Docker healthchecks (PostgreSQL, MinIO, backend)
- ✅ Nginx frontend serving
- ✅ Docker Compose full stack startup

---

## GitHub Repository

https://github.com/Satyanand-1/sales-analytics-data-platform

---

## Author

**Satyanand Indukuri**

Software Developer focused on Full-Stack Development, Python, SQL, Data Engineering, Backend Development, AI/ML Fundamentals, and Deployment & Infrastructure.

---

## Summary

An end-to-end Sales Analytics & Data Engineering Platform demonstrating the complete data lifecycle:

```
Operational Transactions (PostgreSQL)
              ↓
      Python ETL Pipeline
              ↓
        Parquet Files
              ↓
     MinIO Data Lake (S3)
              ↓
     DuckDB Warehouse
              ↓
     Express Analytics APIs
              ↓
      React Dashboard
```

The platform connects operational sales management with analytical reporting through a fully Dockerized, pipeline-driven architecture.
