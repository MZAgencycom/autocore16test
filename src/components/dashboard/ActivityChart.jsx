import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import { supabase } from '../../lib/supabase';

const ActivityChart = ({ period = 'month', refreshKey }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMetrics, setActiveMetrics] = useState({
    reports: true,
    invoices: true,
    payments: true,
    revenue: true,
    timeSaved: true
  });

  // Fetch and process data when period changes
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current date
        const now = new Date();
        let startDate = new Date();
        let periodLabels = [];

        // Set start date and labels based on selected period
        switch(period) {
          case 'month':
            // Last 12 months
            startDate.setMonth(startDate.getMonth() - 11);
            for (let i = 0; i < 12; i++) {
              const date = new Date(startDate);
              date.setMonth(date.getMonth() + i);
              periodLabels.push(date.toLocaleString('fr-FR', { month: 'short' }));
            }
            break;
          case 'quarter':
            // Last 4 quarters
            startDate.setMonth(startDate.getMonth() - 11);
            periodLabels = ['T1', 'T2', 'T3', 'T4'];
            break;
          case 'year':
            // Last 5 years
            startDate.setFullYear(startDate.getFullYear() - 4);
            for (let i = 0; i < 5; i++) {
              const year = startDate.getFullYear() + i;
              periodLabels.push(year.toString());
            }
            break;
          default:
            startDate.setMonth(startDate.getMonth() - 11);
            for (let i = 0; i < 12; i++) {
              const date = new Date(startDate);
              date.setMonth(date.getMonth() + i);
              periodLabels.push(date.toLocaleString('fr-FR', { month: 'short' }));
            }
        }
        
        // Format start date for Supabase query
        const formattedStartDate = startDate.toISOString();

        // Fetch reports
        const { data: reports, error: reportsError } = await supabase
          .from('reports')
          .select('created_at')
          .gte('created_at', formattedStartDate)
          .order('created_at');

        if (reportsError) throw reportsError;

        // Fetch invoices
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('created_at, issue_date, status, total')
          .gte('created_at', formattedStartDate)
          .order('created_at');

        if (invoicesError) throw invoicesError;

        // Process and group data by period
        const chartData = processDataByPeriod(periodLabels, reports, invoices, period);
        
        setData(chartData);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setError('Error loading chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [period, refreshKey]);

  // Process and organize data by time periods
  const processDataByPeriod = (labels, reports, invoices, periodType) => {
    const result = labels.map(label => ({
      name: label,
      reports: 0,
      invoices: 0,
      payments: 0,
      revenue: 0,
      projectedRevenue: 0,
      timeSaved: 0
    }));
    
    const now = new Date();
    
    // Group reports by period
    reports.forEach(report => {
      const reportDate = new Date(report.created_at);
      const index = getPeriodIndex(reportDate, periodType, labels.length);
      if (index >= 0 && index < result.length) {
        result[index].reports += 1;
        // Estimate time saved: ~45 minutes per report
        result[index].timeSaved += 0.75; // 45 minutes in hours
      }
    });

    // Group invoices by period and status
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.issue_date || invoice.created_at);
      const index = getPeriodIndex(invoiceDate, periodType, labels.length);
      if (index >= 0 && index < result.length) {
        // Count all invoices
        result[index].invoices += 1;
        
        // Add ~15 minutes saved per invoice
        result[index].timeSaved += 0.25; // 15 minutes in hours
        
        // Count paid invoices and revenue
        if (invoice.status === 'paid') {
          result[index].payments += 1;
          result[index].revenue += invoice.total || 0;
        } else {
          // Add to projected revenue if not paid
          result[index].projectedRevenue += invoice.total || 0;
        }
      }
    });

    return result;
  };

  // Helper to determine the period index based on date
  const getPeriodIndex = (date, periodType, totalPeriods) => {
    const now = new Date();
    
    switch(periodType) {
      case 'month':
        // Calculate months difference
        const monthsDiff = (now.getFullYear() - date.getFullYear()) * 12 + 
                          (now.getMonth() - date.getMonth());
        return totalPeriods - 1 - Math.min(monthsDiff, totalPeriods - 1);
        
      case 'quarter':
        // Calculate quarter
        const quarter = Math.floor(date.getMonth() / 3);
        return quarter;
        
      case 'year':
        // Calculate years difference
        const yearsDiff = now.getFullYear() - date.getFullYear();
        return totalPeriods - 1 - Math.min(yearsDiff, totalPeriods - 1);
        
      default:
        return 0;
    }
  };

  // Format numbers to be more readable
  const formatNumber = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value;
  };

  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Custom tooltip component with improved formatting
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border shadow-md rounded-md p-3 text-sm">
          <p className="font-medium mb-1">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={`item-${index}`} className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-medium">
                  {entry.name === 'revenue' || entry.name === 'projectedRevenue'
                    ? formatCurrency(entry.value) 
                    : entry.name === 'timeSaved' 
                      ? `${entry.value.toFixed(1)}h` 
                      : formatNumber(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  
    return null;
  };

  // Toggle metrics visibility
  const toggleMetric = (metric) => {
    setActiveMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4 h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 h-full">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 h-full">
      {/* Interactive legends */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleMetric('reports')}
          className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1
            ${activeMetrics.reports ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'}`}
        >
          <div className={`h-2 w-2 rounded-full ${activeMetrics.reports ? 'bg-amber-500' : 'bg-muted-foreground'}`}></div>
          Rapports
        </button>
        <button
          onClick={() => toggleMetric('invoices')}
          className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1
            ${activeMetrics.invoices ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
        >
          <div className={`h-2 w-2 rounded-full ${activeMetrics.invoices ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></div>
          Factures
        </button>
        <button
          onClick={() => toggleMetric('payments')}
          className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1
            ${activeMetrics.payments ? 'bg-blue-500/20 text-blue-600' : 'bg-muted text-muted-foreground'}`}
        >
          <div className={`h-2 w-2 rounded-full ${activeMetrics.payments ? 'bg-blue-500' : 'bg-muted-foreground'}`}></div>
          Paiements
        </button>
        <button
          onClick={() => toggleMetric('revenue')}
          className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1
            ${activeMetrics.revenue ? 'bg-violet-500/20 text-violet-600' : 'bg-muted text-muted-foreground'}`}
        >
          <div className={`h-2 w-2 rounded-full ${activeMetrics.revenue ? 'bg-violet-500' : 'bg-muted-foreground'}`}></div>
          Chiffre d'affaires
        </button>
        <button
          onClick={() => toggleMetric('timeSaved')}
          className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1
            ${activeMetrics.timeSaved ? 'bg-orange-500/20 text-orange-600' : 'bg-muted text-muted-foreground'}`}
        >
          <div className={`h-2 w-2 rounded-full ${activeMetrics.timeSaved ? 'bg-orange-500' : 'bg-muted-foreground'}`}></div>
          Temps économisé
        </button>
      </div>
      
      {/* The chart */}
      <div className="h-[300px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 5,
              right: 5,
              left: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis 
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
              tickFormatter={(value) => formatNumber(value)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
              tickFormatter={(value) => formatCurrency(value)}
              domain={[0, 'dataMax * 1.2']}
            />
            <YAxis
              yAxisId="timeSaved"
              orientation="right"
              tick={false}
              axisLine={false}
              domain={[0, 'dataMax * 1.2']}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {activeMetrics.reports && (
              <Bar 
                yAxisId="left" 
                dataKey="reports" 
                name="Rapports" 
                fill="#f59e0b" 
                fillOpacity={0.8} 
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
            )}
            
            {activeMetrics.invoices && (
              <Bar 
                yAxisId="left" 
                dataKey="invoices" 
                name="Factures" 
                fill="#10b981" 
                fillOpacity={0.8}
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
            )}
            
            {activeMetrics.payments && (
              <Line
                yAxisId="left"
                dataKey="payments"
                name="Paiements"
                type="monotone"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            )}
            
            {activeMetrics.revenue && (
              <Line
                yAxisId="right"
                dataKey="revenue"
                name="Chiffre d'affaires"
                type="monotone"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            )}
            
            {activeMetrics.revenue && (
              <Line 
                yAxisId="right"
                dataKey="projectedRevenue"
                name="CA prévisionnel"
                type="monotone"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, strokeWidth: 1 }}
              />
            )}
            
            {activeMetrics.timeSaved && (
              <Line
                yAxisId="timeSaved"
                dataKey="timeSaved"
                name="Temps économisé"
                type="monotone"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityChart;