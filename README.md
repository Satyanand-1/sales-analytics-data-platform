# Sales Analytics Data Platform

A 2-day Full-Stack Data Lake & Data Warehouse Sales Analytics platform assignment.

## Tech Stack Overview

- **Frontend**: React + TypeScript client dashboard for data visualization, charts, and reporting.
- **Backend**: Node.js + Express API server querying the operational database and exposing analytics.
- **Operational Database**: PostgreSQL database holding transactional/operational sales data.
- **Data Lake**: MinIO (S3-compatible object storage) for storing raw ingested sales data.
- **ETL**: Python ETL pipeline extracting data, landing it in MinIO, and loading it into the data warehouse.
- **Data Warehouse**: DuckDB for analytical processing, aggregations, and business intelligence queries.
- **Orchestration / Deployment**: Docker Compose for running services locally.

## Project Structure

```
sales-analytics-data-platform/
├── backend/       # Node.js + Express API server
├── frontend/      # React + TypeScript client app
├── etl/           # Python ETL scripts & notebooks
├── database/      # PostgreSQL schemas, migrations, and seed scripts
├── data/          # Local volume mounts (ignored, for MinIO, DuckDB, raw local files)
├── docs/          # Project documentation, data models, diagrams
├── .gitignore     # Root gitignore
└── README.md      # This file
```

## Getting Started

*(Instructions on starting the platform using Docker Compose and configuring environments will be added here once implemented.)*
