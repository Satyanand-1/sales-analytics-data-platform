import os
import random
import datetime
import psycopg2
from psycopg2.extras import execute_values

# Setup random seed for reproducibility
random.seed(42)

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
    load_env()
    
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = os.environ.get("POSTGRES_PORT", "5432")
    database = os.environ.get("POSTGRES_DB", "sales_operational")
    user = os.environ.get("POSTGRES_USER", "sales_user")
    password = os.environ.get("POSTGRES_PASSWORD", "sales_password_123")
    
    print(f"Connecting to database '{database}' on {host}:{port} as user '{user}'...")
    return psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password
    )

# Static data lists for generation
INDIAN_CITIES = [
    "Hyderabad", "Visakhapatnam", "Vijayawada", "Bengaluru", 
    "Chennai", "Mumbai", "Delhi", "Pune", "Kolkata"
]

FIRST_NAMES = [
    "Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Krishna", "Ananya", "Diya", 
    "Ira", "Sana", "Rohan", "Rahul", "Karan", "Pooja", "Neha", "Amit", 
    "Sanjay", "Deepak", "Vikram", "Sunita", "Preeti", "Rajesh", "Anil", "Meera", 
    "Kiran", "Suresh", "Ramesh", "Vijay", "Jyothi", "Ganesh"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Kumar", "Singh", "Reddy", "Patel", "Mehta", 
    "Joshi", "Iyer", "Nair", "Rao", "Choudhury", "Das", "Sen", "Chatterjee", 
    "Banerjee", "Mishra", "Pandey", "Deshmukh", "Kulkarni", "Patil", "Naidu", "Bose"
]

PRODUCTS_TEMPLATE = [
    # Electronics
    {"name": "iPhone 15 Pro", "sku": "ELEC-IPH15P", "category": "Electronics", "price": 120000.00},
    {"name": "Samsung Galaxy S24", "sku": "ELEC-GALS24", "category": "Electronics", "price": 79999.00},
    {"name": "Sony WH-1000XM5", "sku": "ELEC-SONYXM5", "category": "Electronics", "price": 29999.00},
    {"name": "Dell XPS 13 Laptop", "sku": "ELEC-DELLXPS", "category": "Electronics", "price": 115000.00},
    {"name": "Apple Watch Series 9", "sku": "ELEC-APLWTCH", "category": "Electronics", "price": 41900.00},
    {"name": "JBL Flip 6 Speaker", "sku": "ELEC-JBLFLIP", "category": "Electronics", "price": 9999.00},
    # Apparel
    {"name": "Nike Air Max Sneakers", "sku": "APPR-NIKEAM", "category": "Apparel", "price": 8995.00},
    {"name": "Levi's 511 Slim Jeans", "sku": "APPR-LEVI511", "category": "Apparel", "price": 3299.00},
    {"name": "Adidas Track Jacket", "sku": "APPR-ADITRK", "category": "Apparel", "price": 4999.00},
    {"name": "Uniqlo Linen Shirt", "sku": "APPR-UNIQLO", "category": "Apparel", "price": 2499.00},
    {"name": "Puma Running Shoes", "sku": "APPR-PUMARUN", "category": "Apparel", "price": 3999.00},
    {"name": "Under Armour Gym Tee", "sku": "APPR-UATEE", "category": "Apparel", "price": 1499.00},
    # Home & Kitchen
    {"name": "Philips Air Fryer", "sku": "HOME-PHLAFR", "category": "Home & Kitchen", "price": 9999.00},
    {"name": "Morphy Richards Coffee Maker", "sku": "HOME-MRCOF", "category": "Home & Kitchen", "price": 4500.00},
    {"name": "Prestige Induction Cooktop", "sku": "HOME-PREIND", "category": "Home & Kitchen", "price": 2800.00},
    {"name": "Wonderchef Blender", "sku": "HOME-WNDBLN", "category": "Home & Kitchen", "price": 3500.00},
    {"name": "Kent RO Water Purifier", "sku": "HOME-KENTRO", "category": "Home & Kitchen", "price": 16500.00},
    {"name": "Dyson V11 Vacuum Cleaner", "sku": "HOME-DYSVAC", "category": "Home & Kitchen", "price": 55000.00},
    # Books
    {"name": "Sapiens by Yuval Noah Harari", "sku": "BOOK-SAPIENS", "category": "Books", "price": 499.00},
    {"name": "Atomic Habits by James Clear", "sku": "BOOK-HABITS", "category": "Books", "price": 399.00},
    {"name": "The Alchemist by Paulo Coelho", "sku": "BOOK-ALCHEM", "category": "Books", "price": 299.00},
    {"name": "A Brief History of Time", "sku": "BOOK-HAWKING", "category": "Books", "price": 599.00},
    {"name": "Wings of Fire by APJ Abdul Kalam", "sku": "BOOK-WINGS", "category": "Books", "price": 199.00},
    {"name": "The Silent Patient", "sku": "BOOK-SILENT", "category": "Books", "price": 350.00},
    # Sports & Outdoors
    {"name": "Decathlon Yoga Mat", "sku": "SPRT-YOGAMAT", "category": "Sports & Outdoors", "price": 999.00},
    {"name": "Nivia Football (Size 5)", "sku": "SPRT-NIVIAFB", "category": "Sports & Outdoors", "price": 799.00},
    {"name": "Quechua Hiking Backpack 30L", "sku": "SPRT-QUEBKP", "category": "Sports & Outdoors", "price": 1999.00},
    {"name": "Yonex Astrox Badminton Racket", "sku": "SPRT-YONEXR", "category": "Sports & Outdoors", "price": 2499.00},
    {"name": "Fitkit Dumbbells 10kg Set", "sku": "SPRT-FITDB", "category": "Sports & Outdoors", "price": 1499.00},
    {"name": "Coleman 4-Person Tent", "sku": "SPRT-COLTENT", "category": "Sports & Outdoors", "price": 8999.00}
]

def generate_synthetic_data(conn):
    """Generates synthetic sales data and inserts it into the database."""
    cur = conn.cursor()
    
    print("Truncating existing tables...")
    cur.execute("TRUNCATE TABLE order_items, orders, products, customers RESTART IDENTITY CASCADE;")
    
    # 1. Insert Products
    print("Generating products...")
    product_records = []
    for prod in PRODUCTS_TEMPLATE:
        product_records.append((prod["name"], prod["sku"], prod["category"], prod["price"]))
    
    execute_values(
        cur,
        "INSERT INTO products (name, sku, category, price) VALUES %s RETURNING product_id, price;",
        product_records
    )
    products_db = cur.fetchall() # List of tuples: (product_id, price)
    
    # 2. Insert Customers
    print("Generating customers...")
    customer_records = []
    emails_used = set()
    
    num_customers = 150
    while len(customer_records) < num_customers:
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        city = random.choice(INDIAN_CITIES)
        email = f"{first.lower()}.{last.lower()}.{len(customer_records)+1}@example.com"
        
        # Phone number generation
        phone = f"+91 {random.randint(60000, 99999)} {random.randint(10000, 99999)}"
        
        if email not in emails_used:
            emails_used.add(email)
            customer_records.append((first, last, email, phone, city))
            
    execute_values(
        cur,
        "INSERT INTO customers (first_name, last_name, email, phone, city) VALUES %s RETURNING customer_id;",
        customer_records
    )
    customer_ids = [row[0] for row in cur.fetchall()]
    
    # 3. Generate Orders and Order Items
    print("Generating orders & order items...")
    num_orders = 1000
    start_date = datetime.datetime.now() - datetime.timedelta(days=365)
    
    order_statuses = ["Completed", "Processing", "Pending", "Cancelled", "Refunded"]
    status_weights = [0.85, 0.08, 0.03, 0.02, 0.02]
    
    for i in range(num_orders):
        customer_id = random.choice(customer_ids)
        
        # Distribute order dates over the past year
        random_days = random.randint(0, 365)
        random_seconds = random.randint(0, 86400)
        order_date = start_date + datetime.timedelta(days=random_days, seconds=random_seconds)
        
        status = random.choices(order_statuses, weights=status_weights, k=1)[0]
        
        # Insert order with default total_amount = 0 (will update later)
        cur.execute(
            "INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (%s, %s, %s, 0.00) RETURNING order_id;",
            (customer_id, order_date, status)
        )
        order_id = cur.fetchone()[0]
        
        # Pick 1 to 3 unique products for this order
        num_items = random.randint(1, 3)
        selected_products = random.sample(products_db, num_items)
        
        order_total = 0.0
        order_item_records = []
        for prod_id, price in selected_products:
            quantity = random.randint(1, 5)
            # convert price to float just in case it is Decimal from DB
            price = float(price)
            subtotal = price * quantity
            order_total += subtotal
            
            order_item_records.append((order_id, prod_id, quantity, price, subtotal))
            
        execute_values(
            cur,
            "INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES %s;",
            order_item_records
        )
        
        # Update order total_amount
        cur.execute(
            "UPDATE orders SET total_amount = %s WHERE order_id = %s;",
            (order_total, order_id)
        )
        
    conn.commit()
    print("Database seeding completed successfully!")
    
    # Print statistics
    cur.execute("SELECT COUNT(*) FROM customers;")
    c_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM products;")
    p_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM orders;")
    o_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM order_items;")
    oi_count = cur.fetchone()[0]
    
    print("\nGeneration Summary:")
    print(f"  Customers:   {c_count}")
    print(f"  Products:    {p_count}")
    print(f"  Orders:      {o_count}")
    print(f"  Order Items: {oi_count}")
    print(f"  Total Records: {c_count + p_count + o_count + oi_count}")

if __name__ == "__main__":
    try:
        connection = get_db_connection()
        generate_synthetic_data(connection)
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        if 'connection' in locals() and connection:
            connection.close()
            print("Database connection closed.")
