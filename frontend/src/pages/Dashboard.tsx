import React, { useEffect, useState } from 'react';
import { fetchRevenueSummary, fetchDailySales, fetchSalesByProduct, fetchSalesByCity } from '../services/api';
import type { RevenueSummary, DailySales, ProductSales, CitySales } from '../types/analytics';
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

  useEffect(() => {
    loadMainData();
    loadProductData();
    loadCityData();
  }, []);

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

      {/* Product Analytics Section (Independent Loading & Error Handling) */}
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

      {/* City Analytics Section (Independent Loading & Error Handling) */}
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
    </div>
  );
};

export default Dashboard;
