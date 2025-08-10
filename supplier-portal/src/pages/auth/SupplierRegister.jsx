import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  ContactPhone as ContactIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { registerSupplier } from '../../services/api';

const steps = ['Company Information', 'Contact Details', 'Business Details', 'Review & Submit'];

const countries = [
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'TR', name: 'Turkey' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'PL', name: 'Poland' },
];

const businessTypes = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'distributor', label: 'Distributor' },
];

const validationSchema = Yup.object({
  companyName: Yup.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters')
    .required('Company name is required'),
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Password confirmation is required'),
  contactPerson: Yup.string()
    .min(2, 'Contact person name must be at least 2 characters')
    .required('Contact person is required'),
  phone: Yup.string()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .required('Phone number is required'),
  address: Yup.string()
    .min(10, 'Address must be at least 10 characters')
    .required('Address is required'),
  country: Yup.string()
    .required('Country is required'),
  businessType: Yup.string()
    .oneOf(['manufacturer', 'wholesaler', 'distributor'])
    .required('Business type is required'),
  taxId: Yup.string()
    .min(5, 'Tax ID must be at least 5 characters'),
  website: Yup.string()
    .url('Invalid website URL'),
  description: Yup.string()
    .min(50, 'Description must be at least 50 characters')
    .max(500, 'Description must be less than 500 characters')
    .required('Business description is required'),
  agreeToTerms: Yup.boolean()
    .oneOf([true], 'You must agree to the terms and conditions'),
  agreeToPrivacy: Yup.boolean()
    .oneOf([true], 'You must agree to the privacy policy'),
});

const SupplierRegister = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const registerMutation = useMutation(registerSupplier, {
    onSuccess: (data) => {
      toast.success('Registration successful! Please check your email to verify your account.');
      navigate('/login', {
        state: { 
          message: 'Registration successful! Please verify your email before logging in.',
          email: formik.values.email 
        }
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
  });

  const formik = useFormik({
    initialValues: {
      companyName: '',
      email: '',
      password: '',
      confirmPassword: '',
      contactPerson: '',
      phone: '',
      address: '',
      country: '',
      businessType: '',
      taxId: '',
      website: '',
      description: '',
      agreeToTerms: false,
      agreeToPrivacy: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      const { confirmPassword, agreeToTerms, agreeToPrivacy, ...submitData } = values;
      registerMutation.mutate(submitData);
    },
  });

  const handleNext = () => {
    const currentStepFields = getFieldsForStep(activeStep);
    const hasErrors = currentStepFields.some(field => 
      formik.errors[field] || !formik.values[field]
    );

    if (hasErrors) {
      currentStepFields.forEach(field => {
        formik.setFieldTouched(field, true);
      });
      return;
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const getFieldsForStep = (step) => {
    switch (step) {
      case 0:
        return ['companyName', 'email', 'password', 'confirmPassword'];
      case 1:
        return ['contactPerson', 'phone', 'address', 'country'];
      case 2:
        return ['businessType', 'description'];
      case 3:
        return ['agreeToTerms', 'agreeToPrivacy'];
      default:
        return [];
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Company Information
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Tell us about your company
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="companyName"
                label="Company Name"
                value={formik.values.companyName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.companyName && Boolean(formik.errors.companyName)}
                helperText={formik.touched.companyName && formik.errors.companyName}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="email"
                label="Business Email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="password"
                label="Password"
                type="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                required
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <ContactIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Contact Details
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                How can we reach you?
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="contactPerson"
                label="Contact Person"
                value={formik.values.contactPerson}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.contactPerson && Boolean(formik.errors.contactPerson)}
                helperText={formik.touched.contactPerson && formik.errors.contactPerson}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="phone"
                label="Phone Number"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
                placeholder="+1234567890"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="address"
                label="Business Address"
                multiline
                rows={3}
                value={formik.values.address}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.address && Boolean(formik.errors.address)}
                helperText={formik.touched.address && formik.errors.address}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Country</InputLabel>
                <Select
                  name="country"
                  value={formik.values.country}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.country && Boolean(formik.errors.country)}
                  label="Country"
                >
                  {countries.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="website"
                label="Website (Optional)"
                value={formik.values.website}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.website && Boolean(formik.errors.website)}
                helperText={formik.touched.website && formik.errors.website}
                placeholder="https://yourcompany.com"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Business Details
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Tell us more about your business
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Business Type</InputLabel>
                <Select
                  name="businessType"
                  value={formik.values.businessType}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.businessType && Boolean(formik.errors.businessType)}
                  label="Business Type"
                >
                  {businessTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="taxId"
                label="Tax ID / VAT Number (Optional)"
                value={formik.values.taxId}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.taxId && Boolean(formik.errors.taxId)}
                helperText={formik.touched.taxId && formik.errors.taxId}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Business Description"
                multiline
                rows={4}
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.description && Boolean(formik.errors.description)}
                helperText={formik.touched.description && formik.errors.description}
                placeholder="Describe your business, products, and manufacturing capabilities..."
                required
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Review & Submit
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Please review your information and accept our terms
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Company Information
                  </Typography>
                  <Typography variant="body2">
                    <strong>Company:</strong> {formik.values.companyName}<br />
                    <strong>Email:</strong> {formik.values.email}<br />
                    <strong>Contact:</strong> {formik.values.contactPerson}<br />
                    <strong>Phone:</strong> {formik.values.phone}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Business Details
                  </Typography>
                  <Typography variant="body2">
                    <strong>Type:</strong> {businessTypes.find(t => t.value === formik.values.businessType)?.label}<br />
                    <strong>Country:</strong> {countries.find(c => c.code === formik.values.country)?.name}<br />
                    {formik.values.website && (
                      <>
                        <strong>Website:</strong> {formik.values.website}<br />
                      </>
                    )}
                    <strong>Description:</strong> {formik.values.description.substring(0, 100)}...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="agreeToTerms"
                    checked={formik.values.agreeToTerms}
                    onChange={formik.handleChange}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the <Link to="/terms" target="_blank">Terms and Conditions</Link>
                  </Typography>
                }
              />
              {formik.touched.agreeToTerms && formik.errors.agreeToTerms && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {formik.errors.agreeToTerms}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="agreeToPrivacy"
                    checked={formik.values.agreeToPrivacy}
                    onChange={formik.handleChange}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the <Link to="/privacy" target="_blank">Privacy Policy</Link>
                  </Typography>
                }
              />
              {formik.touched.agreeToPrivacy && formik.errors.agreeToPrivacy && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {formik.errors.agreeToPrivacy}
                </Typography>
              )}
            </Grid>
          </Grid>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Become a Supplier
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Join our global network of clothing suppliers and grow your business
            </Typography>
          </Box>

          {registerMutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {registerMutation.error?.response?.data?.message || 'Registration failed. Please try again.'}
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {registerMutation.isLoading && <LinearProgress sx={{ mb: 3 }} />}

          <form onSubmit={formik.handleSubmit}>
            <Box sx={{ mb: 3 }}>
              {renderStepContent(activeStep)}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ mr: 1 }}
              >
                Back
              </Button>
              
              <Box>
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={registerMutation.isLoading}
                  >
                    {registerMutation.isLoading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </form>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              Already have an account?{' '}
              <Link to="/login" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}>
                Sign in here
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SupplierRegister;