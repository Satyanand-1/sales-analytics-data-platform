import os
import boto3
import duckdb
from botocore.exceptions import ClientError

def load_env():
    """Loads environment variables from the root .env file if it exists."""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()

def get_s3_client():
    """Establishes connection to MinIO S3 API using environment variables."""
    minio_host = os.environ.get("MINIO_HOST", "localhost")
    minio_port = os.environ.get("MINIO_PORT", "9000")
    minio_user = os.environ.get("MINIO_ROOT_USER", "minio_admin")
    minio_password = os.environ.get("MINIO_ROOT_PASSWORD", "minio_password_123")
    
    endpoint_url = f"http://{minio_host}:{minio_port}"
    
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=minio_user,
        aws_secret_access_key=minio_password,
        config=boto3.session.Config(signature_version="s3v4")
    )

def get_latest_s3_key(s3_client, bucket, prefix):
    """Finds the latest Parquet file key in MinIO for a given table prefix based on LastModified."""
    try:
        paginator = s3_client.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
        
        latest_object = None
        for page in pages:
            if "Contents" in page:
                for obj in page["Contents"]:
                    # Ignore directory markers if any
                    if obj["Key"].endswith("/"):
                        continue
                    if latest_object is None or obj["LastModified"] > latest_object["LastModified"]:
                        latest_object = obj
                        
        if latest_object:
            return latest_object["Key"]
        return None
    except Exception as e:
        print(f"Error listing S3 objects for prefix {prefix}: {e}")
        return None

def run_transformations():
    """Reads Parquet files from MinIO S3 bucket, transforms them, and loads into DuckDB tables."""
    load_env()
    
    minio_host = os.environ.get("MINIO_HOST", "localhost")
    minio_port = os.environ.get("MINIO_PORT", "9000")
    minio_user = os.environ.get("MINIO_ROOT_USER", "minio_admin")
    minio_password = os.environ.get("MINIO_ROOT_PASSWORD", "minio_password_123")
    
    bucket_name = "raw"
    tables = ["customers", "products", "orders", "order_items"]
    
    s3_client = get_s3_client()
    
    # 1. Resolve latest parquet files in MinIO
    latest_keys = {}
    print("Finding the latest Parquet files in MinIO...")
    for t in tables:
        key = get_latest_s3_key(s3_client, bucket_name, f"{t}/")
        if not key:
            raise FileNotFoundError(f"No parquet files found in MinIO for table: '{t}'")
        latest_keys[t] = key
        print(f"  Latest '{t}' key: s3://{bucket_name}/{key}")
        
    # 2. Establish connection to local DuckDB file
    db_path = os.path.join(os.path.dirname(__file__), "..", "data", "sales_warehouse.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    print(f"\nConnecting to DuckDB database at: {db_path}")
    con = duckdb.connect(db_path)
    
    try:
        # 3. Configure S3 settings in DuckDB
        print("Configuring DuckDB S3 access...")
        con.execute("INSTALL httpfs;")
        con.execute("LOAD httpfs;")
        con.execute(f"SET s3_endpoint = '{minio_host}:{minio_port}';")
        con.execute(f"SET s3_access_key_id = '{minio_user}';")
        con.execute(f"SET s3_secret_access_key = '{minio_password}';")
        con.execute("SET s3_use_ssl = false;")
        con.execute("SET s3_url_style = 'path';")
        
        # 4. Create dimension tables
        print("\nCreating/replacing dimension tables...")
        
        # dim_customer
        # Concatenate first_name and last_name into name
        customers_query = f"""
        CREATE OR REPLACE TABLE dim_customer AS
        SELECT 
            customer_id,
            (first_name || ' ' || last_name) AS name,
            city,
            created_at
        FROM read_parquet('s3://{bucket_name}/{latest_keys["customers"]}');
        """
        con.execute(customers_query)
        print("  dim_customer table created.")
        
        # dim_product
        products_query = f"""
        CREATE OR REPLACE TABLE dim_product AS
        SELECT 
            product_id,
            name,
            category,
            price
        FROM read_parquet('s3://{bucket_name}/{latest_keys["products"]}');
        """
        con.execute(products_query)
        print("  dim_product table created.")
        
        # 5. Create fact table
        print("\nCreating/replacing fact table...")
        # Join orders with order_items to obtain customer_id and sale_date
        # revenue calculated as quantity * unit_price
        # Preserves all orders (including Cancelled/Refunded) as per requirement
        fact_query = f"""
        CREATE OR REPLACE TABLE fact_sales AS
        SELECT 
            oi.order_item_id AS sale_id,
            o.customer_id,
            oi.product_id,
            oi.quantity,
            (oi.quantity * oi.unit_price) AS revenue,
            o.order_date AS sale_date
        FROM read_parquet('s3://{bucket_name}/{latest_keys["order_items"]}') oi
        JOIN read_parquet('s3://{bucket_name}/{latest_keys["orders"]}') o 
          ON oi.order_id = o.order_id;
        """
        con.execute(fact_query)
        print("  fact_sales table created.")
        
        # 6. Verification and Output
        print("\n=== Transformation Verification ===")
        for table in ["dim_customer", "dim_product", "fact_sales"]:
            count = con.execute(f"SELECT COUNT(*) FROM {table};").fetchone()[0]
            print(f"\nTable '{table}': {count} records loaded.")
            print("Schema:")
            schema = con.execute(f"PRAGMA table_info({table});").fetchall()
            for col in schema:
                print(f"  - {col[1]:<15} {col[2]}")
                
        print("\nWarehouse transformation completed successfully!")
        
    except Exception as e:
        print(f"\nTransformation failed: {e}")
    finally:
        con.close()
        print("DuckDB connection closed.")

if __name__ == "__main__":
    run_transformations()
