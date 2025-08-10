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
  Inventory,
  AttachMoney,
  Visibility,
  MoreVert,
  Store,
  CheckCircle,
  Pending,
  Cancel,
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
import { fetchSupplierStats, fetchSupplierOrders, fetchSupplierProducts } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/helpers';

// Mock data for demonstration
const mockStats = {
  totalProducts: { value: 45, change: 8.2, trend: 'up' },
  activeProducts: { value: 42, change: 5.1, trend: 'up' },
  totalOrders: { value: 128, change: 12.5, trend: 'up' },
  totalRevenue: { value: 25430.50, change: -2.3, trend: 'down' },
  pendingOrders: { value: 8, change: -15.2, trend: 'down' },
  averageRating: { value: 4.7, change: 0.2, trend: 'up' },
};

const mockSalesData = [
  { month: 'Jan', revenue: 4200, orders: 12 },
  { month: 'Feb', revenue: 3800, orders: 15 },
  { month: 'Mar', revenue: 5100, orders: 18 },
  { month: 'Apr', revenue: 4600, orders: 14 },
  { month: 'May', revenue: 5800, orders: 22 },
  { month: 'Jun', revenue: 6200, orders: 25 },
];

const mockRecentOrders = [
  {
    id: 'ORD-001',
    orderNumber: 'CLT-2024-001',
    customer: 'Fashion Boutique GmbH',
    items: 3,
    total: 485.50,
    status: 'processing',
    date: '2024-01-15'
  },
  {
    id: 'ORD-002',
    orderNumber: 'CLT-2024-002',
    customer: 'Style Store Brasil',
    items: 5,
    total: 720.30,
    status: 'shipped',
    date: '2024-01-14'
  },
  {
    id: 'ORD-003',
    orderNumber: 'CLT-2024-003',
    customer: 'Urban Fashion',
    items: 2,
    total: 295.00,
    status: 'delivered',
    date: '2024-01-12'
  },
  {
    id: 'ORD-004',
    orderNumber: 'CLT-2024-004',
    customer: 'Trendy Clothes',
    items: 7,
    total: 890.75,
    status: 'pending',
    date: '2024-01-10'
  },
];

const mockTopProducts = [
  {
    id: 'P001',
    name: 'Summer Cotton Dress',
    sku: 'SCD-001',
    orders: 25,
    revenue: 1250.00,
    stock: 45,
    rating: 4.8
  },
  {
    id: 'P002',
    name: 'Casual Denim Jacket',
    sku: 'CDJ-002',
    orders: 18,
    revenue: 1080.00,
    stock: 23,
    rating: 4.6
  },
  {
    id: 'P003',
    name: 'Sport Sneakers',
    sku: 'SSN-003',
    orders: 22,
    revenue: 1540.00,
    stock: 12,
    rating: 4.9
  },
  {
    id: 'P004',
    name: 'Winter Wool Coat',
    sku: 'WWC-004',
    orders: 15,
    revenue: 1875.00,
    stock: 8,
    rating: 4.7
  },
];

const mockProductStatusData = [
  { name: 'Active', value: 42, color: '#4caf50' },
  { name: 'Pending', value: 3, color: '#ff9800' },
  { name: 'Inactive', value: 2, color: '#f44336' },
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

const getOrderStatusColor = (status) => {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'shipped':
      return 'info';
    case 'processing':
      return 'warning';
    case 'pending':
      return 'default';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getOrderStatusIcon = (status) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle fontSize="small" />;
    case 'shipped':
      return <ShoppingCart fontSize="small" />;
    case 'processing':
      return <Pending fontSize="small" />;
    case 'pending':
      return <Pending fontSize="small" />;
    case 'cancelled':
      return <Cancel fontSize="small" />;
    default:
      return <Pending fontSize="small" />;
  }
};

const SupplierDashboard = () => {
  const { user } = useAuth();

  // In real implementation, these would fetch actual data
  const { data: supplierStats, isLoading: statsLoading } = useQuery(
    'supplierStats',
    fetchSupplierStats,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      initialData: mockStats,
    }
  );

  const { data: recentOrders, isLoading: ordersLoading } = useQuery(
    'supplierRecentOrders',
    () => fetchSupplierOrders({ page: 1, limit: 5 }),
    {
      refetchInterval: 60000, // Refresh every minute
      initialData: { orders: mockRecentOrders },
    }
  );

  const { data: topProducts, isLoading: productsLoading } = useQuery(
    'supplierTopProducts',
    () => fetchSupplierProducts({ page: 1, limit: 5, sortBy: 'orders' }),
    {
      refetchInterval: 300000, // Refresh every 5 minutes
      initialData: { products: mockTopProducts },
    }
  );

  if (statsLoading || ordersLoading || productsLoading) {
    return <Box sx={{ p: 3 }}><LinearProgress /></Box>;
  }

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Welcome back, {user?.companyName || 'Supplier'}! 👋
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's how your products are performing today.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Total Products"
            value={mockStats.totalProducts.value}
            change={mockStats.totalProducts.change}
            trend={mockStats.totalProducts.trend}
            icon={<Store />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Active Products"
            value={mockStats.activeProducts.value}
            change={mockStats.activeProducts.change}
            trend={mockStats.activeProducts.trend}
            icon={<Inventory />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Total Orders"
            value={mockStats.totalOrders.value}
            change={mockStats.totalOrders.change}
            trend={mockStats.totalOrders.trend}
            icon={<ShoppingCart />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Total Revenue"
            value={mockStats.totalRevenue.value}
            change={mockStats.totalRevenue.change}
            trend={mockStats.totalRevenue.trend}
            icon={<AttachMoney />}
            prefix="€"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Pending Orders"
            value={mockStats.pendingOrders.value}
            change={mockStats.pendingOrders.change}
            trend={mockStats.pendingOrders.trend}
            icon={<Pending />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Avg Rating"
            value={mockStats.averageRating.value}
            change={mockStats.averageRating.change}
            trend={mockStats.averageRating.trend}
            icon={<TrendingUp />}
            suffix="/5"
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
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? `€${value.toLocaleString()}` : value,
                      name === 'revenue' ? 'Revenue' : 'Orders'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1976d2"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Product Status Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Product Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockProductStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockProductStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Products']} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {mockProductStatusData.map((entry) => (
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
                      {entry.value}
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
                      <TableCell>Order #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockRecentOrders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {order.orderNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>{order.items}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 500 }}>
                            €{order.total.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getOrderStatusIcon(order.status)}
                            label={order.status}
                            color={getOrderStatusColor(order.status)}
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(order.date)}
                          </Typography>
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
                  key={product.id}
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
                      SKU: {product.sku} • {product.orders} orders • Rating: {product.rating}/5
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      €{product.revenue.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Stock: {product.stock}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((product.stock / 100) * 100, 100)}
                      sx={{ width: 60, mt: 0.5 }}
                      color={product.stock < 10 ? 'error' : product.stock < 25 ? 'warning' : 'success'}
                    />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Store />}
                    href="/products/create"
                    sx={{ py: 1.5 }}
                  >
                    Add New Product
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Inventory />}
                    href="/inventory"
                    sx={{ py: 1.5 }}
                  >
                    Update Inventory
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ShoppingCart />}
                    href="/orders"
                    sx={{ py: 1.5 }}
                  >
                    Process Orders
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AttachMoney />}
                    href="/analytics"
                    sx={{ py: 1.5 }}
                  >
                    View Analytics
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SupplierDashboard;