import os
import datetime
import psycopg2
import pandas as pd
import boto3
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

def get_db_connection():
    """Establishes connection to PostgreSQL using environment variables."""
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = os.environ.get("POSTGRES_PORT", "5432")
    database = os.environ.get("POSTGRES_DB", "sales_operational")
    user = os.environ.get("POSTGRES_USER", "sales_user")
    password = os.environ.get("POSTGRES_PASSWORD", "sales_password_123")
    
    return psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password
    )

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

def ensure_bucket_exists(s3_client, bucket_name):
    """Ensures the S3/MinIO bucket exists; if not, creates it."""
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        print(f"Bucket '{bucket_name}' already exists.")
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "404":
            print(f"Bucket '{bucket_name}' does not exist. Creating bucket...")
            s3_client.create_bucket(Bucket=bucket_name)
            print(f"Bucket '{bucket_name}' created successfully.")
        else:
            raise e

def check_object_exists(s3_client, bucket, key):
    """Checks if an object exists in the S3 bucket."""
    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            return False
        raise e

def run_extraction():
    """Extracts tables from PostgreSQL, writes to Parquet, and uploads to MinIO."""
    load_env()
    
    db_conn = None
    s3_client = None
    bucket_name = "raw"
    tables = ["customers", "products", "orders", "order_items"]
    
    # Establish directory for local temporary parquet files
    temp_dir = os.path.join(os.path.dirname(__file__), "..", "data", "temp_extract")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        db_conn = get_db_connection()
        s3_client = get_s3_client()
        
        # Verify raw bucket exists
        ensure_bucket_exists(s3_client, bucket_name)
        
        now = datetime.datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%Y%m%d_%H%M%S_%f")
        
        print("\nStarting raw data lake extraction...")
        
        for table in tables:
            # Query operational data
            query = f"SELECT * FROM {table};"
            df = pd.read_sql(query, db_conn)
            
            # Temporary local file
            temp_file = os.path.join(temp_dir, f"{table}.parquet")
            df.to_parquet(temp_file, index=False, engine="pyarrow")
            
            # Check target key to maintain immutability
            default_key = f"{table}/{date_str}/{table}.parquet"
            
            if check_object_exists(s3_client, bucket_name, default_key):
                # Object already exists, append timestamp suffix
                s3_key = f"{table}/{date_str}/{table}_{time_str}.parquet"
                print(f"  [Notice] '{default_key}' already exists in MinIO. Appending timestamp suffix to ensure immutability.")
            else:
                s3_key = default_key
            
            # Upload file
            s3_client.upload_file(temp_file, bucket_name, s3_key)
            
            # Cleanup local file
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
            print(f"  Extracted {len(df):>4} rows from '{table}' -> uploaded to s3://{bucket_name}/{s3_key}")
            
        print("\nExtraction completed successfully!")
        
    except Exception as e:
        print(f"\nExtraction failed: {e}")
    finally:
        # Cleanup temp directory if empty
        try:
            if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                os.rmdir(temp_dir)
        except OSError:
            pass
            
        if db_conn:
            db_conn.close()
            print("PostgreSQL connection closed.")

if __name__ == "__main__":
    run_extraction()
