import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

import ShippingService from '../../services/ShippingService';
import { formatDate } from '../../services/i18n';

const TrackingScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { trackingNumber: initialTrackingNumber } = route.params || {};
  
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber || '');
  const [trackingData, setTrackingData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialTrackingNumber) {
      handleTrackShipment();
    }
  }, [initialTrackingNumber]);

  const handleTrackShipment = async () => {
    if (!trackingNumber.trim()) {
      Alert.alert(t('tracking.error'), t('tracking.enterTrackingNumber'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await ShippingService.trackShipment(trackingNumber.trim());
      
      if (result.success) {
        setTrackingData(result.data.tracking);
        setOrderData(result.data.order);
      } else {
        setError(result.error);
        setTrackingData(null);
        setOrderData(null);
      }
    } catch (error) {
      setError(t('tracking.trackingFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!trackingNumber.trim()) return;
    
    setIsRefreshing(true);
    await handleTrackShipment();
    setIsRefreshing(false);
  };

  const getStatusStyle = (status) => {
    const statusInfo = ShippingService.formatTrackingStatus(status);
    return {
      color: statusInfo.color,
      icon: statusInfo.icon,
      label: statusInfo.label
    };
  };

  const renderTrackingEvents = () => {
    if (!trackingData?.events || trackingData.events.length === 0) {
      return (
        <View style={styles.noEventsContainer}>
          <Icon name="info" size={24} color="#999" />
          <Text style={styles.noEventsText}>{t('tracking.noEvents')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.eventsContainer}>
        <Text style={styles.sectionTitle}>{t('tracking.trackingHistory')}</Text>
        {trackingData.events.map((event, index) => (
          <View key={index} style={styles.eventItem}>
            <View style={styles.eventIndicator}>
              <View style={[
                styles.eventDot, 
                index === 0 && styles.currentEventDot
              ]} />
              {index < trackingData.events.length - 1 && (
                <View style={styles.eventLine} />
              )}
            </View>
            <View style={styles.eventContent}>
              <Text style={[
                styles.eventStatus,
                index === 0 && styles.currentEventStatus
              ]}>
                {event.description}
              </Text>
              <Text style={styles.eventDate}>
                {formatDate(event.timestamp, 'en', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              {event.location && (
                <Text style={styles.eventLocation}>
                  {event.location.city}, {event.location.country}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderOrderInfo = () => {
    if (!orderData) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('tracking.orderInformation')}</Text>
        <View style={styles.orderInfoContainer}>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>{t('tracking.orderNumber')}</Text>
            <Text style={styles.orderInfoValue}>{orderData.order_number}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>{t('tracking.orderDate')}</Text>
            <Text style={styles.orderInfoValue}>
              {formatDate(orderData.created_at, 'en', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>{t('tracking.orderTotal')}</Text>
            <Text style={styles.orderInfoValue}>
              {orderData.currency} {parseFloat(orderData.total_amount).toFixed(2)}
            </Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>{t('tracking.orderStatus')}</Text>
            <Text style={[
              styles.orderInfoValue,
              { color: getStatusStyle(orderData.status).color }
            ]}>
              {t(`orderStatus.${orderData.status}`)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTrackingInfo = () => {
    if (!trackingData) return null;

    const statusStyle = getStatusStyle(trackingData.status);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('tracking.shipmentStatus')}</Text>
        <View style={styles.trackingInfoContainer}>
          <View style={styles.statusContainer}>
            <Icon 
              name={statusStyle.icon} 
              size={32} 
              color={statusStyle.color} 
              style={styles.statusIcon}
            />
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {statusStyle.label}
              </Text>
              <Text style={styles.statusDescription}>
                {trackingData.statusDescription}
              </Text>
            </View>
          </View>
          
          <View style={styles.trackingDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('tracking.trackingNumber')}</Text>
              <Text style={styles.detailValue}>{trackingData.trackingNumber}</Text>
            </View>
            
            {trackingData.estimatedDeliveryDate && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('tracking.estimatedDelivery')}</Text>
                <Text style={styles.detailValue}>
                  {formatDate(trackingData.estimatedDeliveryDate, 'en', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            )}
            
            {trackingData.origin && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('tracking.origin')}</Text>
                <Text style={styles.detailValue}>
                  {trackingData.origin.city}, {trackingData.origin.country}
                </Text>
              </View>
            )}
            
            {trackingData.destination && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('tracking.destination')}</Text>
                <Text style={styles.detailValue}>
                  {trackingData.destination.city}, {trackingData.destination.country}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
          />
        }
      >
        {/* Tracking Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tracking.enterTrackingNumber')}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.trackingInput}
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              placeholder={t('tracking.trackingNumberPlaceholder')}
              placeholderTextColor="#999"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.trackButton, isLoading && styles.disabledButton]}
              onPress={handleTrackShipment}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Icon name="search" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Icon name="error" size={24} color="#FF5722" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Order Information */}
        {renderOrderInfo()}

        {/* Tracking Information */}
        {renderTrackingInfo()}

        {/* Tracking Events */}
        {trackingData && renderTrackingEvents()}

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tracking.needHelp')}</Text>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => navigation.navigate('Support')}
          >
            <Icon name="help" size={20} color="#2196F3" />
            <Text style={styles.helpButtonText}>{t('tracking.contactSupport')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  trackButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  errorText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FF5722',
    flex: 1,
  },
  orderInfoContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  trackingInfoContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusIcon: {
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  trackingDetails: {
    paddingTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  eventsContainer: {
    marginTop: 8,
  },
  eventItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  eventIndicator: {
    alignItems: 'center',
    marginRight: 12,
    width: 20,
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
    zIndex: 1,
  },
  currentEventDot: {
    backgroundColor: '#2196F3',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  eventLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#ddd',
    marginTop: 4,
  },
  eventContent: {
    flex: 1,
    paddingBottom: 8,
  },
  eventStatus: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  currentEventStatus: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 14,
    color: '#999',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noEventsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  helpButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
});

export default TrackingScreen;