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
