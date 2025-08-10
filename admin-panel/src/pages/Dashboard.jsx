import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  People,
  Inventory,
  AttachMoney,
  Visibility,
  MoreVert,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery } from 'react-query';
import { fetchDashboardStats } from '../services/api';

// Mock data for demonstration
const mockStats = {
  totalRevenue: { value: 125430, change: 12.5, trend: 'up' },
  totalOrders: { value: 1284, change: -2.3, trend: 'down' },
  totalCustomers: { value: 8542, change: 8.1, trend: 'up' },
  totalProducts: { value: 2156, change: 4.2, trend: 'up' },
};

const mockSalesData = [
  { name: 'Jan', sales: 4000, revenue: 24000 },
  { name: 'Feb', sales: 3000, revenue: 18000 },
  { name: 'Mar', sales: 2000, revenue: 12000 },
  { name: 'Apr', sales: 2780, revenue: 16680 },
  { name: 'May', sales: 1890, revenue: 11340 },
  { name: 'Jun', sales: 2390, revenue: 14340 },
  { name: 'Jul', sales: 3490, revenue: 20940 },
];

const mockRecentOrders = [
  { id: 'ORD-001', customer: 'John Doe', total: 125.50, status: 'completed', country: 'DE' },
  { id: 'ORD-002', customer: 'Maria Silva', total: 89.30, status: 'processing', country: 'BR' },
  { id: 'ORD-003', customer: 'Hans Mueller', total: 256.80, status: 'shipped', country: 'DE' },
  { id: 'ORD-004', customer: 'João Santos', total: 167.20, status: 'pending', country: 'BR' },
  { id: 'ORD-005', customer: 'Sarah Johnson', total: 98.75, status: 'completed', country: 'NA' },
];

const mockTopProducts = [
  { name: 'Summer Dress', sales: 156, revenue: 7800, stock: 45 },
  { name: 'Casual Shirt', sales: 142, revenue: 4260, stock: 23 },
  { name: 'Denim Jacket', sales: 98, revenue: 5880, stock: 12 },
  { name: 'Sport Shoes', sales: 87, revenue: 6960, stock: 67 },
  { name: 'Winter Coat', sales: 76, revenue: 9120, stock: 8 },
];

const mockCountryData = [
  { name: 'Germany', value: 45, color: '#8884d8' },
  { name: 'Brazil', value: 30, color: '#82ca9d' },
  { name: 'France', value: 15, color: '#ffc658' },
  { name: 'Namibia', value: 10, color: '#ff7300' },
];

const StatCard = ({ title, value, change, trend, icon, prefix = '', suffix = '' }) => {
  const trendColor = trend === 'up' ? 'success.main' : 'error.main';
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendIcon sx={{ color: trendColor, mr: 0.5, fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: trendColor, fontWeight: 500 }}>
                {change > 0 ? '+' : ''}{change}%
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                vs last month
              </Typography>
            </Box>
          </Box>
          <Avatar sx={{ backgroundColor: 'primary.light', width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'warning';
    case 'shipped':
      return 'info';
    case 'pending':
      return 'default';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getCountryFlag = (country) => {
  const flags = {
    DE: '🇩🇪',
    BR: '🇧🇷',
    FR: '🇫🇷',
    NA: '🇳🇦',
    ES: '🇪🇸',
    IT: '🇮🇹',
  };
  return flags[country] || '🌍';
};

const Dashboard = () => {
  const { data: dashboardStats, isLoading } = useQuery(
    'dashboardStats',
    fetchDashboardStats,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      initialData: mockStats,
    }
  );

  if (isLoading) {
    return <Box sx={{ p: 3 }}><LinearProgress /></Box>;
  }

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Welcome back! 👋
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's what's happening with your store today.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={mockStats.totalRevenue.value}
            change={mockStats.totalRevenue.change}
            trend={mockStats.totalRevenue.trend}
            icon={<AttachMoney />}
            prefix="€"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Orders"
            value={mockStats.totalOrders.value}
            change={mockStats.totalOrders.change}
            trend={mockStats.totalOrders.trend}
            icon={<ShoppingCart />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={mockStats.totalCustomers.value}
            change={mockStats.totalCustomers.change}
            trend={mockStats.totalCustomers.trend}
            icon={<People />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Products"
            value={mockStats.totalProducts.value}
            change={mockStats.totalProducts.change}
            trend={mockStats.totalProducts.trend}
            icon={<Inventory />}
          />
        </Grid>

        {/* Sales Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Sales Overview
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={mockSalesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'sales' ? value : `€${value.toLocaleString()}`,
                      name === 'sales' ? 'Orders' : 'Revenue'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Sales by Country */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Sales by Country
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockCountryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockCountryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {mockCountryData.map((entry) => (
                  <Box
                    key={entry.name}
                    sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        backgroundColor: entry.color,
                        borderRadius: '50%',
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {entry.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {entry.value}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Orders */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Recent Orders
                </Typography>
                <Button size="small" href="/orders">
                  View All
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Country</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockRecentOrders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {order.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: 8 }}>
                              {getCountryFlag(order.country)}
                            </span>
                            {order.country}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 500 }}>
                            €{order.total.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            color={getStatusColor(order.status)}
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small">
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Top Products
                </Typography>
                <Button size="small" href="/products">
                  View All
                </Button>
              </Box>
              {mockTopProducts.map((product, index) => (
                <Box
                  key={product.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 1.5,
                    borderBottom: index < mockTopProducts.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Avatar
                    sx={{
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText',
                      mr: 2,
                      width: 40,
                      height: 40,
                    }}
                  >
                    {index + 1}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {product.sales} sales • €{product.revenue.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Stock: {product.stock}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((product.stock / 100) * 100, 100)}
                      sx={{ width: 60, mt: 0.5 }}
                      color={product.stock < 20 ? 'error' : product.stock < 50 ? 'warning' : 'success'}
                    />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;