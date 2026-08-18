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
