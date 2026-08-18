import React, { useEffect, useState } from 'react';
import { fetchRevenueSummary, fetchDailySales } from '../services/api';
import type { RevenueSummary, DailySales } from '../types/analytics';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

const Dashboard: React.FC = () => {
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch summary and daily sales concurrently
      const [summaryData, dailyData] = await Promise.all([
        fetchRevenueSummary(),
        fetchDailySales()
      ]);
      
      setRevenueSummary(summaryData);
      setDailySales(dailyData);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  // Format currency shorthand for Y-Axis
  const formatCurrencyYAxis = (value: number) => {
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

      {loading && (
        <div className="loading-state">
          <p>Loading analytics data...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={loadData}>Retry</button>
        </div>
      )}

      {!loading && !error && (
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
          <div className="chart-card">
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
                      tickFormatter={formatCurrencyYAxis}
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
    </div>
  );
};

export default Dashboard;
