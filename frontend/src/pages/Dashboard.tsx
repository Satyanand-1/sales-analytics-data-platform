import React, { useEffect, useState } from 'react';
import { 
  fetchRevenueSummary, 
  fetchDailySales, 
  fetchSalesByProduct, 
  fetchSalesByCity,
  fetchPipelineStatus,
  triggerPipeline,
  fetchCustomers,
  createCustomer,
  fetchProducts,
  createProduct,
  fetchOrders,
  createOrder
} from '../services/api';
import type { 
  RevenueSummary, 
  DailySales, 
  ProductSales, 
  CitySales,
  PipelineState,
  Customer,
  Product,
  Order
} from '../types/analytics';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const date = new Date(label || '');
    const formattedDate = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    return (
      <div className="custom-tooltip">
        <p className="tooltip-date">{formattedDate}</p>
        <p className="tooltip-revenue">
          Revenue: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(payload[0].value)}
        </p>
        <p className="tooltip-orders">
          Orders: {payload[0].payload.totalOrders}
        </p>
      </div>
    );
  }
  return null;
};

const ProductTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProductSales;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-date" style={{ textTransform: 'uppercase', fontWeight: 700 }}>{data.category}</p>
        <p className="tooltip-revenue" style={{ color: '#10b981' }}>
          Revenue: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(data.totalRevenue)}
        </p>
        <p className="tooltip-orders">
          Units Sold: {data.totalUnits}
        </p>
      </div>
    );
  }
  return null;
};

const CityTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CitySales;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-date" style={{ textTransform: 'uppercase', fontWeight: 700 }}>{data.city}</p>
        <p className="tooltip-revenue" style={{ color: '#3b82f6' }}>
          Revenue: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(data.totalRevenue)}
        </p>
        <p className="tooltip-orders">
          Orders: {data.totalOrders}
        </p>
        <p className="tooltip-orders" style={{ marginTop: '0.125rem' }}>
          Units Sold: {data.totalUnits}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'sales'>('analytics');

  // Main metrics & Daily sales states
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [mainLoading, setMainLoading] = useState<boolean>(true);
  const [mainError, setMainError] = useState<string | null>(null);

  // Independent Product analytics states
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [productLoading, setProductLoading] = useState<boolean>(true);
  const [productError, setProductError] = useState<string | null>(null);

  // Independent City analytics states
  const [citySales, setCitySales] = useState<CitySales[]>([]);
  const [cityLoading, setCityLoading] = useState<boolean>(true);
  const [cityError, setCityError] = useState<string | null>(null);

  // In-memory Pipeline execution states
  const [pipeline, setPipelineState] = useState<PipelineState | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  // --- Operational Sales Management States ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [operationalLoading, setOperationalLoading] = useState<boolean>(true);
  const [operationalError, setOperationalError] = useState<string | null>(null);

  // Customer Form State
  const [custFirst, setCustFirst] = useState('');
  const [custLast, setCustLast] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custCity, setCustCity] = useState('');
  const [custErr, setCustErr] = useState<string | null>(null);
  const [custSuccess, setCustSuccess] = useState<string | null>(null);
  const [custSubmitting, setCustSubmitting] = useState(false);

  // Product Form State
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodErr, setProdErr] = useState<string | null>(null);
  const [prodSuccess, setProdSuccess] = useState<string | null>(null);
  const [prodSubmitting, setProdSubmitting] = useState(false);

  // Order Form State
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderStatus, setOrderStatus] = useState('Pending');
  const [orderItems, setOrderItems] = useState<{ product_id: number; quantity: number }[]>([
    { product_id: 0, quantity: 1 }
  ]);
  const [orderErr, setOrderErr] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  const loadMainData = async () => {
    try {
      setMainLoading(true);
      setMainError(null);
      const [summaryData, dailyData] = await Promise.all([
        fetchRevenueSummary(),
        fetchDailySales()
      ]);
      setRevenueSummary(summaryData);
      setDailySales(dailyData);
    } catch (err: any) {
      console.error('Error fetching main dashboard data:', err);
      setMainError(err.message || 'Failed to load main dashboard metrics.');
    } finally {
      setMainLoading(false);
    }
  };

  const loadProductData = async () => {
    try {
      setProductLoading(true);
      setProductError(null);
      const data = await fetchSalesByProduct();
      setProductSales(data);
    } catch (err: any) {
      console.error('Error fetching product data:', err);
      setProductError(err.message || 'Failed to load product analytics.');
    } finally {
      setProductLoading(false);
    }
  };

  const loadCityData = async () => {
    try {
      setCityLoading(true);
      setCityError(null);
      const data = await fetchSalesByCity();
      setCitySales(data);
    } catch (err: any) {
      console.error('Error fetching city data:', err);
      setCityError(err.message || 'Failed to load city analytics.');
    } finally {
      setCityLoading(false);
    }
  };

  const loadPipelineStatus = async () => {
    try {
      const state = await fetchPipelineStatus();
      setPipelineState(state);
      return state;
    } catch (err: any) {
      console.error('Error loading pipeline status:', err);
    }
  };

  // Fetch operational lookup data from PostgreSQL
  const loadOperationalData = async () => {
    try {
      setOperationalLoading(true);
      setOperationalError(null);
      const [customersList, productsList, ordersList] = await Promise.all([
        fetchCustomers(),
        fetchProducts(),
        fetchOrders()
      ]);
      setCustomers(customersList);
      setProducts(productsList);
      setOrders(ordersList);
    } catch (err: any) {
      console.error('Error loading operational data:', err);
      setOperationalError(err.message || 'Failed to fetch operational databases. Is PostgreSQL connected?');
    } finally {
      setOperationalLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    try {
      setTriggerError(null);
      const res = await triggerPipeline();
      setPipelineState(res.state);
    } catch (err: any) {
      console.error('Error triggering pipeline:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to trigger data pipeline.';
      setTriggerError(errMsg);
    }
  };

  // Initial mount load
  useEffect(() => {
    loadMainData();
    loadProductData();
    loadCityData();
    loadPipelineStatus();
    loadOperationalData();
  }, []);

  // Polling loop for active background executions
  useEffect(() => {
    let interval: any = null;
    if (pipeline && pipeline.status === 'running') {
      interval = setInterval(async () => {
        const state = await loadPipelineStatus();
        if (state && (state.status === 'success' || state.status === 'failed')) {
          clearInterval(interval);
          // Auto refresh all active dashboard charts only on success
          if (state.status === 'success') {
            loadMainData();
            loadProductData();
            loadCityData();
            loadOperationalData(); // Sync operational values too
          }
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pipeline?.status]);

  // Handle Customer Form Submit
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustErr(null);
    setCustSuccess(null);
    setCustSubmitting(true);

    try {
      const res = await createCustomer({
        first_name: custFirst,
        last_name: custLast,
        email: custEmail,
        phone: custPhone,
        city: custCity
      });
      setCustSuccess(res.message);
      setCustFirst('');
      setCustLast('');
      setCustEmail('');
      setCustPhone('');
      setCustCity('');
      await loadOperationalData(); // Refresh customers list
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to create customer.';
      setCustErr(errMsg);
    } finally {
      setCustSubmitting(false);
    }
  };

  // Handle Product Form Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdErr(null);
    setProdSuccess(null);
    setProdSubmitting(true);

    try {
      const priceVal = parseFloat(prodPrice);
      const res = await createProduct({
        name: prodName,
        sku: prodSku,
        category: prodCategory,
        price: priceVal
      });
      setProdSuccess(res.message);
      setProdName('');
      setProdSku('');
      setProdCategory('');
      setProdPrice('');
      await loadOperationalData(); // Refresh products list
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to create product.';
      setProdErr(errMsg);
    } finally {
      setProdSubmitting(false);
    }
  };

  // Dynamically calculate screen running total (backend remains authoritative)
  const calculateRunningTotal = () => {
    let total = 0;
    const priceMap = new Map<number, number>();
    products.forEach(p => {
      if (p.product_id) priceMap.set(p.product_id, p.price);
    });

    orderItems.forEach(item => {
      const price = priceMap.get(item.product_id) || 0;
      total += item.quantity * price;
    });
    return total;
  };

  // Handle Order Item Form Row Actions
  const handleItemFieldChange = (index: number, field: 'product_id' | 'quantity', value: number) => {
    const updated = [...orderItems];
    updated[index][field] = value;
    setOrderItems(updated);
  };

  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { product_id: 0, quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (orderItems.length === 1) return; // Keep at least 1 row
    const updated = orderItems.filter((_, idx) => idx !== index);
    setOrderItems(updated);
  };

  // Handle Order Form Submit
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderErr(null);
    setOrderSuccess(null);
    setOrderSubmitting(true);

    try {
      const custId = parseInt(orderCustomerId, 10);
      if (isNaN(custId)) {
        throw new Error('Please select a customer.');
      }

      // Filter out unselected product rows
      const validItems = orderItems.map(item => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity)
      }));

      // Frontend validation for duplicate products
      const pids = validItems.map(i => i.product_id);
      const duplicate = pids.some((val, i) => pids.indexOf(val) !== i);
      if (duplicate) {
        throw new Error('Duplicate products in single order is rejected.');
      }

      const orderPayload: any = {
        customer_id: custId,
        status: orderStatus,
        items: validItems
      };

      if (orderDate && orderDate.trim()) {
        orderPayload.order_date = new Date(orderDate).toISOString();
      }

      const res = await createOrder(orderPayload);
      setOrderSuccess(res.message);
      setOrderCustomerId('');
      setOrderDate('');
      setOrderStatus('Pending');
      setOrderItems([{ product_id: 0, quantity: 1 }]);
      await loadOperationalData(); // Refresh orders grid
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit sales order.';
      setOrderErr(errMsg);
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Format currency helper (Indian Rupee)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format integer helper
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  // Format date ticks for X-Axis (e.g. "25 Feb")
  const formatDateXAxis = (tick: string) => {
    if (!tick) return '';
    const date = new Date(tick);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  // Format currency shorthand for Y/X-Axis
  const formatCurrencyShorthand = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Sales Analytics Dashboard</h1>
        <p>Real-time business performance metrics from your Analytical Data Warehouse</p>
      </header>

      {/* Tabs Selector Bar */}
      <div className="tabs-bar" style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2e8f0', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          style={{
            background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            color: activeTab === 'analytics' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'analytics' ? '3px solid #2563eb' : 'none'
          }}
        >
          Analytics Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sales' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('sales')}
          style={{
            background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            color: activeTab === 'sales' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'sales' ? '3px solid #2563eb' : 'none'
          }}
        >
          Sales Management
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Pipeline Controller Runner Component */}
          <div className="chart-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h2 className="chart-title" style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  Analytical Data Pipeline
                  {pipeline && (
                    <span className={`status-badge status-${pipeline.status}`}>
                      {pipeline.status === 'running' ? 'Running' : pipeline.status === 'success' ? 'Success' : pipeline.status === 'failed' ? 'Failed' : 'Idle'}
                    </span>
                  )}
                </h2>
                <p className="chart-subtitle" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                  {pipeline ? pipeline.progressMessage : 'Resolving execution status...'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {pipeline?.lastSuccessfulRun && (
                  <span className="last-run-timestamp">
                    Last Run: {new Date(pipeline.lastSuccessfulRun).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
                <button
                  className={`run-pipeline-btn ${pipeline?.status === 'running' ? 'btn-loading' : ''}`}
                  onClick={handleRunPipeline}
                  disabled={pipeline?.status === 'running'}
                >
                  {pipeline?.status === 'running' ? 'Executing Pipeline...' : 'Run Data Pipeline'}
                </button>
              </div>
            </div>

            {/* Processed Counts Display */}
            {pipeline && (pipeline.recordCounts.customers !== null || pipeline.recordCounts.dim_customer !== null) && (
              <div className="pipeline-counts-grid">
                {pipeline.recordCounts.customers !== null && (
                  <div className="counts-col">
                    <strong>Raw Ingested:</strong> {pipeline.recordCounts.customers} customers | {pipeline.recordCounts.products} products | {pipeline.recordCounts.orders} orders | {pipeline.recordCounts.orderItems} items
                  </div>
                )}
                {pipeline.recordCounts.dim_customer !== null && (
                  <div className="counts-col">
                    <strong>Warehouse Loaded:</strong> {pipeline.recordCounts.dim_customer} dim_customer | {pipeline.recordCounts.dim_product} dim_product | {pipeline.recordCounts.fact_sales} fact_sales
                  </div>
                )}
              </div>
            )}

            {/* Pipeline Failures Display */}
            {(triggerError || (pipeline && pipeline.error)) && (
              <div className="pipeline-error-box">
                <h4>Pipeline Execution Failed</h4>
                <p className="error-msg-detail">{triggerError || pipeline?.error?.message}</p>
                {pipeline?.error?.step && (
                  <p className="error-step-detail">Failed during step: <em>{pipeline.error.step}</em></p>
                )}
              </div>
            )}
          </div>

          {/* Main Content Area (KPIs & Daily Sales Chart) */}
          {mainLoading && (
            <div className="loading-state" style={{ marginBottom: '2rem' }}>
              <p>Loading summary analytics data...</p>
            </div>
          )}

          {mainError && (
            <div className="error-state" style={{ marginBottom: '2rem' }}>
              <h3>Error Loading Summary Data</h3>
              <p>{mainError}</p>
              <button className="retry-btn" onClick={loadMainData}>Retry</button>
            </div>
          )}

          {!mainLoading && !mainError && (
            <>
              {/* KPI Grid */}
              {revenueSummary && (
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <h3>Total Revenue</h3>
                    <p className="kpi-value">{formatCurrency(revenueSummary.totalRevenue)}</p>
                  </div>

                  <div className="kpi-card">
                    <h3>Total Orders</h3>
                    <p className="kpi-value">{formatNumber(revenueSummary.totalOrders)}</p>
                  </div>

                  <div className="kpi-card">
                    <h3>Total Units Sold</h3>
                    <p className="kpi-value">{formatNumber(revenueSummary.totalUnitsSold)}</p>
                  </div>

                  <div className="kpi-card">
                    <h3>Average Order Value</h3>
                    <p className="kpi-value">{formatCurrency(revenueSummary.averageOrderValue)}</p>
                  </div>
                </div>
              )}

              {/* Daily Sales Chart */}
              <div className="chart-card" style={{ marginBottom: '2.5rem' }}>
                <h2 className="chart-title">Daily Sales Trend</h2>
                <p className="chart-subtitle">Daily revenue trends and order counts over time</p>
                
                {dailySales.length === 0 ? (
                  <div className="empty-chart-state">
                    <p>No sales trend data available for this timeframe.</p>
                  </div>
                ) : (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart
                        data={dailySales}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDateXAxis} 
                          tickLine={false}
                          axisLine={false}
                          stroke="#94a3b8"
                          fontSize={12}
                          dy={10}
                        />
                        <YAxis 
                          tickFormatter={formatCurrencyShorthand}
                          tickLine={false}
                          axisLine={false}
                          stroke="#94a3b8"
                          fontSize={12}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="totalRevenue" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorRevenue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Product Analytics Section */}
          <div className="product-analytics-section" style={{ marginTop: '2.5rem' }}>
            {productLoading && (
              <div className="loading-state">
                <p>Loading product performance metrics...</p>
              </div>
            )}

            {productError && (
              <div className="error-state">
                <h3>Error Loading Product Analytics</h3>
                <p>{productError}</p>
                <button className="retry-btn" onClick={loadProductData}>Retry</button>
              </div>
            )}

            {!productLoading && !productError && (
              <div className="chart-card" style={{ marginBottom: '2.5rem' }}>
                <h2 className="chart-title">Product Performance Analytics</h2>
                <p className="chart-subtitle">Revenue rankings and units sold for all catalog products</p>
                
                {productSales.length === 0 ? (
                  <div className="empty-chart-state">
                    <p>No product sales data available.</p>
                  </div>
                ) : (
                  <div className="product-grid">
                    {/* Horizontal Bar Chart (Top 10 Products) */}
                    <div className="product-chart-col">
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>Top 10 Products by Revenue</h3>
                      <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={380}>
                          <BarChart
                            data={productSales.slice(0, 10)}
                            layout="vertical"
                            margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis 
                              type="number"
                              tickFormatter={formatCurrencyShorthand}
                              tickLine={false}
                              axisLine={false}
                              stroke="#94a3b8"
                              fontSize={11}
                            />
                            <YAxis 
                              type="category"
                              dataKey="productName" 
                              tickLine={false}
                              axisLine={false}
                              stroke="#334155"
                              fontSize={11}
                              width={110}
                            />
                            <Tooltip content={<ProductTooltip />} />
                            <Bar 
                              dataKey="totalRevenue" 
                              fill="#10b981" 
                              radius={[0, 4, 4, 0]}
                              barSize={18}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Scrollable Ranking Table (All 30 Products) */}
                    <div className="product-table-col">
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>All Products Detailed Ranking</h3>
                      <div className="table-scroll-container">
                        <table className="ranking-table">
                          <thead>
                            <tr>
                              <th>Rank</th>
                              <th>Product Name</th>
                              <th>Category</th>
                              <th>Units</th>
                              <th>Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productSales.map((item, idx) => (
                              <tr key={item.productName}>
                                <td>
                                  <span className={`rank-badge rank-${idx + 1 <= 3 ? idx + 1 : 'default'}`}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="product-name-cell">{item.productName}</td>
                                <td><span className="category-tag">{item.category}</span></td>
                                <td className="number-cell">{formatNumber(item.totalUnits)}</td>
                                <td className="number-cell font-bold">{formatCurrency(item.totalRevenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* City Analytics Section */}
          <div className="city-analytics-section" style={{ marginTop: '2.5rem' }}>
            {cityLoading && (
              <div className="loading-state">
                <p>Loading city performance metrics...</p>
              </div>
            )}

            {cityError && (
              <div className="error-state">
                <h3>Error Loading City Analytics</h3>
                <p>{cityError}</p>
                <button className="retry-btn" onClick={loadCityData}>Retry</button>
              </div>
            )}

            {!cityLoading && !cityError && (
              <div className="chart-card">
                <h2 className="chart-title">Geographical Sales Performance</h2>
                <p className="chart-subtitle">Sales revenues, order counts, and volume by operational city</p>
                
                {citySales.length === 0 ? (
                  <div className="empty-chart-state">
                    <p>No city sales records available.</p>
                  </div>
                ) : (
                  <div className="product-grid">
                    {/* Horizontal Bar Chart (9 Cities) */}
                    <div className="product-chart-col">
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>Revenue by City</h3>
                      <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart
                            data={citySales}
                            layout="vertical"
                            margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis 
                              type="number"
                              tickFormatter={formatCurrencyShorthand}
                              tickLine={false}
                              axisLine={false}
                              stroke="#94a3b8"
                              fontSize={11}
                            />
                            <YAxis 
                              type="category"
                              dataKey="city" 
                              tickLine={false}
                              axisLine={false}
                              stroke="#334155"
                              fontSize={11}
                              width={100}
                            />
                            <Tooltip content={<CityTooltip />} />
                            <Bar 
                              dataKey="totalRevenue" 
                              fill="#3b82f6" 
                              radius={[0, 4, 4, 0]}
                              barSize={18}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Detailed Table (9 Cities) */}
                    <div className="product-table-col">
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>City Distribution Details</h3>
                      <div className="table-scroll-container">
                        <table className="ranking-table">
                          <thead>
                            <tr>
                              <th>Rank</th>
                              <th>City</th>
                              <th>Total Orders</th>
                              <th>Units Sold</th>
                              <th>Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {citySales.map((item, idx) => (
                              <tr key={item.city}>
                                <td>
                                  <span className={`rank-badge rank-${idx + 1 <= 3 ? idx + 1 : 'default'}`}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="product-name-cell">{item.city}</td>
                                <td className="number-cell">{formatNumber(item.totalOrders)}</td>
                                <td className="number-cell">{formatNumber(item.totalUnits)}</td>
                                <td className="number-cell font-bold">{formatCurrency(item.totalRevenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* --- Operational Sales Management Workspace --- */
        <div className="sales-management-workspace">
          {operationalLoading ? (
            <div className="loading-state">
              <p>Loading operational databases from PostgreSQL...</p>
            </div>
          ) : operationalError ? (
            <div className="error-state">
              <h3>Database Connection Failure</h3>
              <p>{operationalError}</p>
              <button className="retry-btn" onClick={loadOperationalData}>Retry Connect</button>
            </div>
          ) : (
            <div className="product-grid" style={{ gridTemplateColumns: '1fr' }}>
              
              {/* Dynamic Action Forms Block */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                
                {/* 1. Create Customer Form */}
                <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                  <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>Create Customer</h3>
                  <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" placeholder="First Name" required 
                        value={custFirst} onChange={e => setCustFirst(e.target.value)}
                        style={{ width: '50%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input 
                        type="text" placeholder="Last Name" required 
                        value={custLast} onChange={e => setCustLast(e.target.value)}
                        style={{ width: '50%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <input 
                      type="email" placeholder="Email Address" required 
                      value={custEmail} onChange={e => setCustEmail(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                      type="text" placeholder="Phone Number (Optional)" 
                      value={custPhone} onChange={e => setCustPhone(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                      type="text" placeholder="City" required 
                      value={custCity} onChange={e => setCustCity(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    
                    {custErr && <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.8rem' }}>{custErr}</p>}
                    {custSuccess && <p style={{ margin: 0, color: '#047857', fontSize: '0.8rem' }}>{custSuccess}</p>}
                    
                    <button 
                      type="submit" disabled={custSubmitting}
                      style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {custSubmitting ? 'Saving...' : 'Save Customer'}
                    </button>
                  </form>
                </div>

                {/* 2. Create Product Form */}
                <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                  <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>Create Product</h3>
                  <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input 
                      type="text" placeholder="Product Name" required 
                      value={prodName} onChange={e => setProdName(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                      type="text" placeholder="Unique SKU (e.g. SKU-LAP-01)" required 
                      value={prodSku} onChange={e => setProdSku(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                      type="text" placeholder="Category" required 
                      value={prodCategory} onChange={e => setProdCategory(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                      type="number" placeholder="Price (INR)" step="0.01" min="0" required 
                      value={prodPrice} onChange={e => setProdPrice(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    
                    {prodErr && <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.8rem' }}>{prodErr}</p>}
                    {prodSuccess && <p style={{ margin: 0, color: '#047857', fontSize: '0.8rem' }}>{prodSuccess}</p>}

                    <button 
                      type="submit" disabled={prodSubmitting}
                      style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {prodSubmitting ? 'Saving...' : 'Save Product'}
                    </button>
                  </form>
                </div>

                {/* 3. Create Sales Order Form (Dynamic Item Rows) */}
                <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                  <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>Create Sales Order</h3>
                  <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <select 
                      required value={orderCustomerId} onChange={e => setOrderCustomerId(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(c => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.first_name} {c.last_name} ({c.city})
                        </option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="datetime-local" placeholder="Order Date (Optional)" 
                        value={orderDate} onChange={e => setOrderDate(e.target.value)}
                        style={{ width: '60%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <select 
                        value={orderStatus} onChange={e => setOrderStatus(e.target.value)}
                        style={{ width: '40%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </div>

                    {/* Dynamic Items Builder */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Order Items</label>
                      {orderItems.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                          <select 
                            required value={item.product_id} 
                            onChange={e => handleItemFieldChange(idx, 'product_id', parseInt(e.target.value, 10))}
                            style={{ flex: 1, padding: '0.375rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.8rem' }}
                          >
                            <option value="0">Select Product</option>
                            {products.map(p => (
                              <option key={p.product_id} value={p.product_id}>
                                {p.name} ({formatCurrency(p.price)})
                              </option>
                            ))}
                          </select>
                          <input 
                            type="number" min="1" required placeholder="Qty"
                            value={item.quantity} 
                            onChange={e => handleItemFieldChange(idx, 'quantity', parseInt(e.target.value, 10))}
                            style={{ width: '55px', padding: '0.375rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                          />
                          <button 
                            type="button" onClick={() => handleRemoveItemRow(idx)}
                            disabled={orderItems.length === 1}
                            style={{ padding: '0.375rem 0.5rem', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            X
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button" onClick={handleAddItemRow}
                        style={{ marginTop: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        + Add Product Row
                      </button>
                    </div>

                    {/* Running total display */}
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Running Total:</span>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{formatCurrency(calculateRunningTotal())}</strong>
                    </div>

                    {orderErr && <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.8rem' }}>{orderErr}</p>}
                    {orderSuccess && <p style={{ margin: 0, color: '#047857', fontSize: '0.8rem' }}>{orderSuccess}</p>}

                    <button 
                      type="submit" disabled={orderSubmitting}
                      style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {orderSubmitting ? 'Submitting Order...' : 'Submit Sales Order'}
                    </button>
                  </form>
                </div>
              </div>

              {/* 4. Sales Orders History List Table */}
              <div className="chart-card">
                <h2 className="chart-title">Sales Order Invoices</h2>
                <p className="chart-subtitle" style={{ marginBottom: '1.25rem' }}>Transaction logs stored in the operational PostgreSQL database</p>
                
                {orders.length === 0 ? (
                  <div className="empty-chart-state">
                    <p>No sales order transactions found.</p>
                  </div>
                ) : (
                  <div className="table-scroll-container" style={{ maxHeight: '550px' }}>
                    <table className="ranking-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Order Date</th>
                          <th>Customer</th>
                          <th>Email</th>
                          <th>City</th>
                          <th>Status</th>
                          <th className="number-cell">Items Count</th>
                          <th className="number-cell">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.order_id}>
                            <td className="product-name-cell">#{order.order_id}</td>
                            <td>{new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{order.customer_name}</td>
                            <td>{order.customer_email}</td>
                            <td><span className="category-tag">{order.customer_city}</span></td>
                            <td>
                              <span className={`status-badge status-${order.status.toLowerCase()}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="number-cell">{order.item_count} items</td>
                            <td className="number-cell font-bold">{formatCurrency(Number(order.total_amount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
