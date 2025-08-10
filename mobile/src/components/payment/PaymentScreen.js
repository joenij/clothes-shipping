import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import PaymentService from '../../services/PaymentService';
import { selectCartTotals, selectCartItems, clearCart } from '../../store/slices/cartSlice';
import { selectUser } from '../../store/slices/authSlice';
import { createOrder } from '../../store/slices/orderSlice';

import PaymentMethodCard from '../components/PaymentMethodCard';
import AddPaymentMethodModal from '../components/AddPaymentMethodModal';
import LoadingOverlay from '../components/LoadingOverlay';

const PaymentScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const dispatch = useDispatch();
  
  const { orderId, shippingAddress, billingAddress } = route.params;
  
  const cartTotals = useSelector(selectCartTotals);
  const cartItems = useSelector(selectCartItems);
  const user = useSelector(selectUser);
  
  const [isLoading, setIsLoading] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [saveNewPaymentMethod, setSaveNewPaymentMethod] = useState(false);

  useEffect(() => {
    // Initialize payment service
    PaymentService.initialize(stripe);
    
    // Load saved payment methods
    loadSavedPaymentMethods();
  }, [stripe]);

  const loadSavedPaymentMethods = async () => {
    const result = await PaymentService.getSavedPaymentMethods();
    if (result.success) {
      setSavedPaymentMethods(result.data);
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod && !showAddPaymentModal) {
      Alert.alert(
        t('payment.error'),
        t('payment.selectPaymentMethod')
      );
      return;
    }

    setIsLoading(true);

    try {
      let paymentResult;

      if (selectedPaymentMethod) {
        // Use saved payment method
        paymentResult = await PaymentService.processWithSavedPaymentMethod({
          paymentMethodId: selectedPaymentMethod.id,
          amount: parseFloat(cartTotals.total),
          currency: cartTotals.currency,
          orderId: orderId
        });
      } else {
        // Process new payment method
        const billingDetails = {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          address: {
            city: billingAddress.city,
            country: billingAddress.country,
            line1: billingAddress.addressLine1,
            line2: billingAddress.addressLine2,
            postalCode: billingAddress.postalCode,
            state: billingAddress.stateProvince,
          }
        };

        paymentResult = await PaymentService.processCardPayment({
          amount: parseFloat(cartTotals.total),
          currency: cartTotals.currency,
          orderId: orderId,
          billingDetails: billingDetails,
          savePaymentMethod: saveNewPaymentMethod
        });
      }

      if (paymentResult.success) {
        // Clear cart
        dispatch(clearCart());
        
        // Navigate to success screen
        navigation.replace('PaymentSuccess', {
          orderId: orderId,
          paymentIntent: paymentResult.data.paymentIntent
        });
      } else {
        Alert.alert(
          t('payment.error'),
          paymentResult.error
        );
      }
    } catch (error) {
      Alert.alert(
        t('payment.error'),
        t('payment.processingFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGooglePay = async () => {
    setIsLoading(true);
    
    try {
      const result = await PaymentService.processGooglePay({
        amount: parseFloat(cartTotals.total),
        currency: cartTotals.currency,
        orderId: orderId
      });

      if (result.success) {
        dispatch(clearCart());
        navigation.replace('PaymentSuccess', {
          orderId: orderId,
          paymentIntent: result.data.paymentIntent
        });
      } else {
        Alert.alert(t('payment.error'), result.error);
      }
    } catch (error) {
      Alert.alert(t('payment.error'), t('payment.googlePayFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayPal = async () => {
    // Navigate to PayPal web view
    navigation.navigate('PayPalPayment', {
      amount: cartTotals.total,
      currency: cartTotals.currency,
      orderId: orderId
    });
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    Alert.alert(
      t('payment.deletePaymentMethod'),
      t('payment.deletePaymentMethodConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const result = await PaymentService.deleteSavedPaymentMethod(paymentMethodId);
            if (result.success) {
              setSavedPaymentMethods(prev => 
                prev.filter(method => method.id !== paymentMethodId)
              );
              if (selectedPaymentMethod?.id === paymentMethodId) {
                setSelectedPaymentMethod(null);
              }
            } else {
              Alert.alert(t('payment.error'), result.error);
            }
          }
        }
      ]
    );
  };

  const formatCardNumber = (last4, brand) => {
    return `**** **** **** ${last4}`;
  };

  const getCardIcon = (brand) => {
    const icons = {
      'visa': 'credit-card',
      'mastercard': 'credit-card',
      'amex': 'credit-card',
      'discover': 'credit-card',
      'diners': 'credit-card',
      'jcb': 'credit-card',
      'unionpay': 'credit-card',
      'unknown': 'credit-card'
    };
    return icons[brand] || 'credit-card';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('payment.orderSummary')}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('payment.subtotal')}</Text>
            <Text style={styles.summaryValue}>
              {PaymentService.formatAmount(parseFloat(cartTotals.subtotal), cartTotals.currency)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('payment.tax')}</Text>
            <Text style={styles.summaryValue}>
              {PaymentService.formatAmount(parseFloat(cartTotals.tax), cartTotals.currency)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('payment.shipping')}</Text>
            <Text style={styles.summaryValue}>
              {PaymentService.formatAmount(parseFloat(cartTotals.shipping), cartTotals.currency)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('payment.total')}</Text>
            <Text style={styles.totalValue}>
              {PaymentService.formatAmount(parseFloat(cartTotals.total), cartTotals.currency)}
            </Text>
          </View>
        </View>

        {/* Saved Payment Methods */}
        {savedPaymentMethods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('payment.savedPaymentMethods')}</Text>
            {savedPaymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  selectedPaymentMethod?.id === method.id && styles.selectedPaymentMethod
                ]}
                onPress={() => setSelectedPaymentMethod(method)}
              >
                <View style={styles.paymentMethodInfo}>
                  <Icon 
                    name={getCardIcon(method.card.brand)} 
                    size={24} 
                    color="#333"
                  />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardNumber}>
                      {formatCardNumber(method.card.last4, method.card.brand)}
                    </Text>
                    <Text style={styles.cardExpiry}>
                      {method.card.expMonth.toString().padStart(2, '0')}/{method.card.expYear}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeletePaymentMethod(method.id)}
                  style={styles.deleteButton}
                >
                  <Icon name="delete" size={20} color="#ff4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Add New Payment Method */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.addPaymentButton}
            onPress={() => setShowAddPaymentModal(true)}
          >
            <Icon name="add-circle-outline" size={24} color="#2196F3" />
            <Text style={styles.addPaymentText}>{t('payment.addNewPaymentMethod')}</Text>
          </TouchableOpacity>
        </View>

        {/* Alternative Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('payment.alternativePaymentMethods')}</Text>
          
          <TouchableOpacity
            style={styles.alternativePaymentButton}
            onPress={handleGooglePay}
            disabled={isLoading}
          >
            <Icon name="android" size={24} color="#4285F4" />
            <Text style={styles.alternativePaymentText}>{t('payment.googlePay')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.alternativePaymentButton}
            onPress={handlePayPal}
            disabled={isLoading}
          >
            <Icon name="payment" size={24} color="#003087" />
            <Text style={styles.alternativePaymentText}>{t('payment.paypal')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.paymentButtonContainer}>
        <TouchableOpacity
          style={[styles.paymentButton, isLoading && styles.disabledButton]}
          onPress={handlePayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.paymentButtonText}>
              {t('payment.payNow')} {PaymentService.formatAmount(parseFloat(cartTotals.total), cartTotals.currency)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        visible={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onPaymentMethodAdded={(method) => {
          setSavedPaymentMethods(prev => [...prev, method]);
          setSelectedPaymentMethod(method);
          setShowAddPaymentModal(false);
        }}
        savePaymentMethod={saveNewPaymentMethod}
        onSavePaymentMethodChange={setSaveNewPaymentMethod}
      />

      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedPaymentMethod: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardInfo: {
    marginLeft: 12,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  cardExpiry: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addPaymentText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  alternativePaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  alternativePaymentText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  paymentButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paymentButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaymentScreen;