# Data Warehouse Specification - DuckDB Layer

This document describes the schema and design decisions of the DuckDB analytical layer for the Sales Analytics platform.

## Database Location
The persistent DuckDB data warehouse is stored locally at:
- [`data/sales_warehouse.db`](file:///c:/Projects/sales-analytics-data-platform/data/sales_warehouse.db)

---

## Schema Definitions

### 1. `dim_customer`
Dimension table holding customer profiles.
- **Grain**: One row per customer.
- **Source**: `raw/customers/` parquet files.
- **Columns**:
  - `customer_id` (BIGINT, Primary Key)
  - `name` (VARCHAR): Created by concatenating `first_name` and `last_name` from PostgreSQL.
  - `city` (VARCHAR)
  - `created_at` (TIMESTAMP WITH TIME ZONE)

### 2. `dim_product`
Dimension table holding product configurations.
- **Grain**: One row per product.
- **Source**: `raw/products/` parquet files.
- **Columns**:
  - `product_id` (BIGINT, Primary Key)
  - `name` (VARCHAR)
  - `category` (VARCHAR)
  - `price` (DOUBLE)

### 3. `fact_sales`
Fact table recording transactional sales details.
- **Grain**: One row per product line within an order (corresponds to an `order_items` record).
- **Source**: Joined `raw/order_items/` and `raw/orders/` parquet files.
- **Columns**:
  - `sale_id` (BIGINT, Primary Key): Maps directly to `order_item_id`.
  - `order_id` (BIGINT, Foreign Key referencing the original order)
  - `customer_id` (BIGINT, Foreign Key referencing `dim_customer`)
  - `product_id` (BIGINT, Foreign Key referencing `dim_product`)
  - `quantity` (BIGINT)
  - `revenue` (DOUBLE): Calculated dynamically as `quantity * unit_price`.
  - `sale_date` (TIMESTAMP WITH TIME ZONE): Derived from `orders.order_date`.

---

## Business Rule Treatment: Cancelled and Refunded Orders

> [!NOTE]
> **Treatment Decision**: Cancelled and Refunded orders are **fully preserved** in the data warehouse (`fact_sales`). 

### Rationale
- The assignment requirements do not specify a concrete business rule for filtering out or adjustment of cancelled/refunded records at the ETL or warehouse stage.
- Discarding these records at the ETL level would result in a permanent loss of visibility into customer return behavior, cancellation rates, and operational issues.
- **Query-Stage Resolution**: The decision of whether to filter out cancelled/refunded sales (e.g., when calculating net revenue vs gross revenue) is deferred to the **analytics-query/reporting stage**. Analytics queries can join `fact_sales` with raw orders metadata or we will apply filtering logic depending on the dashboard requirements.
