import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Translation files
import en from '../locales/en.json';
import pt from '../locales/pt.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';

const LANGUAGE_STORAGE_KEY = '@app_language';

// Get device language
const getDeviceLanguage = () => {
  const locales = RNLocalize.getLocales();
  if (locales.length > 0) {
    const deviceLanguage = locales[0].languageCode;
    // Map device language to supported languages
    const supportedLanguages = ['en', 'pt', 'de', 'fr', 'es'];
    return supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';
  }
  return 'en';
};

// Get stored language preference
const getStoredLanguage = async () => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage || getDeviceLanguage();
  } catch (error) {
    console.error('Error getting stored language:', error);
    return getDeviceLanguage();
  }
};

// Store language preference
export const storeLanguage = async (language) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Error storing language:', error);
  }
};

// Language resources
const resources = {
  en: { translation: en },
  pt: { translation: pt },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
};

// Initialize i18n
const initI18n = async () => {
  const language = await getStoredLanguage();
  
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'en',
      
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      
      // React i18next options
      react: {
        useSuspense: false,
      },
      
      // Formatting options
      returnObjects: true,
      
      // Debug mode in development
      debug: __DEV__,
    });
    
  return i18n;
};

// Change language and persist
export const changeLanguage = async (language) => {
  try {
    await i18n.changeLanguage(language);
    await storeLanguage(language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Get available languages
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

// Format currency based on language
export const formatCurrency = (amount, currency = 'EUR', language = 'en') => {
  try {
    const locale = getLocaleFromLanguage(language);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${currency} ${parseFloat(amount).toFixed(2)}`;
  }
};

// Get locale from language code
const getLocaleFromLanguage = (language) => {
  const localeMap = {
    'en': 'en-US',
    'pt': 'pt-BR',
    'de': 'de-DE',
    'fr': 'fr-FR',
    'es': 'es-ES',
  };
  
  return localeMap[language] || 'en-US';
};

// Format date based on language
export const formatDate = (date, language = 'en', options = {}) => {
  try {
    const locale = getLocaleFromLanguage(language);
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options })
      .format(new Date(date));
  } catch (error) {
    return new Date(date).toLocaleDateString();
  }
};

// Format number based on language
export const formatNumber = (number, language = 'en') => {
  try {
    const locale = getLocaleFromLanguage(language);
    return new Intl.NumberFormat(locale).format(number);
  } catch (error) {
    return number.toString();
  }
};

// Initialize i18n immediately
initI18n();

export default i18n;