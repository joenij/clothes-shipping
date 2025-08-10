import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  LinearProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

const SupplierLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Get any messages from navigation state
  const message = location.state?.message;
  const suggestedEmail = location.state?.email;

  const loginMutation = useMutation(login, {
    onSuccess: (data) => {
      toast.success('Login successful!');
      navigate('/dashboard');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Login failed';
      toast.error(errorMessage);
      
      // If email not verified, redirect to verification page
      if (errorMessage.includes('verify your email')) {
        navigate('/verify-email', {
          state: { email: formik.values.email }
        });
      }
    },
  });

  const formik = useFormik({
    initialValues: {
      email: suggestedEmail || '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      loginMutation.mutate(values);
    },
  });

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <BusinessIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Supplier Portal
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Sign in to your supplier account
            </Typography>
          </Box>

          {message && (
            <Alert 
              severity={message.includes('successful') || message.includes('verify') ? 'success' : 'info'} 
              sx={{ mb: 3 }}
            >
              {message}
            </Alert>
          )}

          {loginMutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {loginMutation.error?.response?.data?.message || 'Login failed. Please check your credentials.'}
            </Alert>
          )}

          {loginMutation.isLoading && <LinearProgress sx={{ mb: 3 }} />}

          <form onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              name="email"
              label="Email"
              type="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              margin="normal"
              required
              autoComplete="email"
              autoFocus={!suggestedEmail}
            />

            <TextField
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              margin="normal"
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loginMutation.isLoading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loginMutation.isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Link 
                to="/forgot-password" 
                style={{ 
                  textDecoration: 'none', 
                  color: 'inherit', 
                  fontSize: '0.875rem',
                  opacity: 0.7 
                }}
              >
                Forgot your password?
              </Link>
            </Box>
          </form>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              New to our supplier network?
            </Typography>
            <Link 
              to="/register" 
              style={{ 
                textDecoration: 'none', 
                color: 'inherit', 
                fontWeight: 'bold' 
              }}
            >
              Apply to become a supplier
            </Link>
          </Box>

          {/* Status Information */}
          <Box sx={{ mt: 4, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
              <strong>Account Status Requirements:</strong><br />
              • Email verification required<br />
              • Admin approval needed for new suppliers<br />
              • Contact support for assistance: support@clothesshipping.com
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SupplierLogin;