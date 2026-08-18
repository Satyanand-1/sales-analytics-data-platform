// Analytics data types (placeholder for future implementation)

export interface RevenueSummary {
  totalRevenue: number;
  totalUnitsSold: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface ProductSales {
  productName: string;
  category: string;
  totalUnits: number;
  totalRevenue: number;
}

export interface CitySales {
  city: string;
  totalOrders: number;
  totalUnits: number;
  totalRevenue: number;
}

export interface DailySales {
  date: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface PipelineState {
  status: 'idle' | 'running' | 'success' | 'failed';
  progressMessage: string;
  startedAt: string | null;
  completedAt: string | null;
  lastSuccessfulRun: string | null;
  error: { message: string; step: string } | null;
  recordCounts: {
    customers: number | null;
    products: number | null;
    orders: number | null;
    orderItems: number | null;
    dim_customer: number | null;
    dim_product: number | null;
    fact_sales: number | null;
  };
}

// Operational Data Models
export interface Customer {
  customer_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city: string;
  created_at?: string;
}

export interface Product {
  product_id?: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  created_at?: string;
}

export interface OrderItemInput {
  product_id: number;
  quantity: number;
}

export interface OrderInput {
  customer_id: number;
  order_date?: string;
  status?: string;
  items: OrderItemInput[];
}

export interface Order {
  order_id: number;
  order_date: string;
  customer_name: string;
  customer_email: string;
  customer_city: string;
  status: string;
  total_amount: number;
  item_count: number;
}
