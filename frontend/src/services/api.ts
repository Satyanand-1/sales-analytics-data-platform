import axios from 'axios';
import type { 
  RevenueSummary, 
  ProductSales, 
  CitySales, 
  DailySales, 
  PipelineState,
  Customer,
  Product,
  OrderInput,
  Order
} from '../types/analytics';

// Set up base Axios instance pointing to our Node.js Express backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchRevenueSummary = async (): Promise<RevenueSummary> => {
  const response = await api.get<RevenueSummary>('/analytics/revenue');
  return response.data;
};

export const fetchSalesByProduct = async (): Promise<ProductSales[]> => {
  const response = await api.get<ProductSales[]>('/analytics/sales-by-product');
  return response.data;
};

export const fetchSalesByCity = async (): Promise<CitySales[]> => {
  const response = await api.get<CitySales[]>('/analytics/sales-by-city');
  return response.data;
};

export const fetchDailySales = async (): Promise<DailySales[]> => {
  const response = await api.get<DailySales[]>('/analytics/daily-sales');
  return response.data;
};

export const fetchPipelineStatus = async (): Promise<PipelineState> => {
  const response = await api.get<PipelineState>('/pipeline/status');
  return response.data;
};

export const triggerPipeline = async (): Promise<{ message: string; state: PipelineState }> => {
  const response = await api.post<{ message: string; state: PipelineState }>('/pipeline/run');
  return response.data;
};

// Operational Customers APIs
export const fetchCustomers = async (): Promise<Customer[]> => {
  const response = await api.get<Customer[]>('/customers');
  return response.data;
};

export const createCustomer = async (data: Customer): Promise<{ message: string; customer: Customer }> => {
  const response = await api.post<{ message: string; customer: Customer }>('/customers', data);
  return response.data;
};

// Operational Products APIs
export const fetchProducts = async (): Promise<Product[]> => {
  const response = await api.get<Product[]>('/products');
  return response.data;
};

export const createProduct = async (data: Product): Promise<{ message: string; product: Product }> => {
  const response = await api.post<{ message: string; product: Product }>('/products', data);
  return response.data;
};

// Operational Orders APIs
export const fetchOrders = async (): Promise<Order[]> => {
  const response = await api.get<Order[]>('/orders');
  return response.data;
};

export const createOrder = async (data: OrderInput): Promise<{ message: string; order: any }> => {
  const response = await api.post<{ message: string; order: any }>('/orders', data);
  return response.data;
};

export default api;
