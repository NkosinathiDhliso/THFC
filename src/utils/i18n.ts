// Internationalization utilities for THFCScan
// Supporting English, Afrikaans, and Zulu

type Locale = 'en' | 'af' | 'zu';

let currentLocale: Locale = 'en';

// Translation dictionaries
const translations = {
  en: {
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
    },
    donation: {
      newReport: 'New Donation Report',
      storeLocation: 'Store Location',
      whiteBread: 'White Bread',
      brownBread: 'Brown Bread',
      takePhoto: 'Take Photo',
      submit: 'Submit Report',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
    },
  },
  af: {
    auth: {
      signIn: 'Teken In',
      signUp: 'Registreer',
      signOut: 'Teken Uit',
      email: 'E-pos',
      password: 'Wagwoord',
      forgotPassword: 'Wagwoord Vergeet?',
    },
    donation: {
      newReport: 'Nuwe Skenking Verslag',
      storeLocation: 'Winkel Ligging',
      whiteBread: 'Wit Brood',
      brownBread: 'Bruin Brood',
      takePhoto: 'Neem Foto',
      submit: 'Dien Verslag In',
    },
    common: {
      loading: 'Laai...',
      error: 'Fout',
      success: 'Sukses',
      cancel: 'Kanselleer',
      confirm: 'Bevestig',
    },
  },
  zu: {
    auth: {
      signIn: 'Ngena',
      signUp: 'Bhalisa',
      signOut: 'Phuma',
      email: 'I-imeyili',
      password: 'Iphasiwedi',
      forgotPassword: 'Ukhohlwe Iphasiwedi?',
    },
    donation: {
      newReport: 'Umbiko Omusha Wokunikela',
      storeLocation: 'Indawo Yesitolo',
      whiteBread: 'Isinkwa Esimhlophe',
      brownBread: 'Isinkwa Esinsundu',
      takePhoto: 'Thatha Isithombe',
      submit: 'Thumela Umbiko',
    },
    common: {
      loading: 'Iyalayisha...',
      error: 'Iphutha',
      success: 'Impumelelo',
      cancel: 'Khansela',
      confirm: 'Qinisekisa',
    },
  },
};

export const setLocale = (locale: Locale): void => {
  currentLocale = locale;
};

export const getLocale = (): Locale => {
  return currentLocale;
};

export const t = (key: string): string => {
  const keys = key.split('.');
  let value: unknown = translations[currentLocale];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Fallback to English
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = (value as Record<string, unknown>)[fallbackKey];
        } else {
          return key; // Return key if not found
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
};

export const formatDate = (date: Date, locale: Locale = currentLocale): string => {
  return new Intl.DateTimeFormat(locale === 'zu' ? 'en-ZA' : locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatNumber = (number: number, locale: Locale = currentLocale): string => {
  return new Intl.NumberFormat(locale === 'zu' ? 'en-ZA' : locale).format(number);
};

export const formatCurrency = (amount: number, locale: Locale = currentLocale): string => {
  return new Intl.NumberFormat(locale === 'zu' ? 'en-ZA' : locale, {
    style: 'currency',
    currency: 'ZAR',
    currencyDisplay: 'symbol',
  }).format(amount);
};