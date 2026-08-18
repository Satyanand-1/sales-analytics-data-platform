import React, { useEffect, useState } from 'react';
import { fetchRevenueSummary } from '../services/api';
import { RevenueSummary } from '../types/analytics';

const Dashboard: React.FC = () => {
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRevenueSummary();
      setRevenueSummary(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load revenue summary analytics. Please try again.');
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

      {!loading && !error && revenueSummary && (
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
    </div>
  );
};

export default Dashboard;
