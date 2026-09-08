import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getItem, saveItem } from '../utils/storage';

export type Language = 'en' | 'te';

interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Navigation
    home: 'Home',
    categories: 'Categories',
    orders: 'Orders',
    cart: 'Cart',
    profile: 'Profile',

    // Menu items
    yourOrders: 'Your Orders',
    wallet: 'Digital Wallet',
    referAndEarn: 'Refer & Earn',
    savedAddresses: 'Saved Addresses',
    accountSettings: 'Account Settings',
    notifications: 'Notifications',
    helpSupport: 'Help & Support',
    appSettings: 'App Settings',
    offersPromoCodes: 'Offers & Promo Codes',
    languages: 'Languages',
    logout: 'Sign Out',
    login: 'Sign In',
    favorites: 'Favorites',
    back: 'Back',

    // Menu item descriptions
    yourOrdersDesc: 'Track, return, or buy things again',
    walletDesc: 'Check your balance and transactions',
    referAndEarnDesc: 'Invite friends, earn real money!',
    accountSettingsDesc: 'Manage password & personal details',
    savedAddressesDesc: 'Edit addresses for quick checkout',
    favoritesDesc: 'View your saved products',
    notificationsDesc: 'Offers and order updates',
    offersDesc: 'Coupons, vouchers & festive deals',
    languagesDesc: 'English, తెలుగు',
    appSettingsDesc: 'Theme, text size & updates',
    logoutDesc: 'Log out safely from this device',

    // App Settings terms
    appearance: 'Appearance',
    light: 'Light',
    dark: 'Dark',
    system: 'System Default',
    fontSize: 'Font Size',
    normal: 'Normal',
    large: 'Large',
    extraLarge: 'Extra Large',
    appVersion: 'App Version',
    checkForUpdates: 'Check for Updates',
    checkingUpdates: 'Checking for updates...',
    upToDate: 'You are on the latest version!',
    appearanceHint: 'Customize how Smart Kirana looks on your device.',
    fontSizeHint: 'Adjust text size across the app for comfortable reading.',
    previewTitle: 'Live Preview',
    previewText: 'Smart Kirana delivers fresh groceries, daily essentials, and veggies straight to your doorstep at wholesale prices.',

    // Offers terms
    availableOffers: 'Available Offers',
    copyCode: 'Copy Code',
    copied: 'Copied!',
    minOrder: 'Min order: ₹',
    validTill: 'Valid till: ',
    noOffers: 'No offers or promo codes available right now.',
    noOffersSub: 'Check back later for fresh coupons and special grocery discounts!',
    expires: 'Expires',
    maxDiscount: 'Max discount: ₹',
    allCategories: 'All Products',

    // Languages screen
    selectLanguage: 'Select Preferred Language',
    chooseLanguageSubtitle: 'Choose the language you prefer for browsing and ordering',
    englishTitle: 'English (India)',
    englishSub: 'English (India)',
    teluguTitle: 'తెలుగు (India)',
    teluguSub: 'Telugu (India)',

    // Catalog & Search
    searchPlaceholder: 'Search products...',
    shopByCategory: 'Shop by category',
    seeAll: 'See all →',
    exploreCatalog: 'Explore Catalog',
    popularSearches: 'Popular Searches',
    noProductsFound: 'No products found',
    clearFilters: 'Clear Filters / Show All',
    addToCart: 'ADD TO CART',
    outOfStock: 'OUT OF STOCK',
    freeDelivery: 'Free Delivery',
    digitalWallet: 'Digital Wallet',

    // Auth
    welcomeBack: 'Welcome back',
    createAccount: 'Create Account',
    forgotPassword: 'Forgot Password',
    resetPassword: 'Reset Password',
  },
  te: {
    // Navigation
    home: 'హోమ్',
    categories: 'కేటగిరీలు',
    orders: 'ఆర్డర్లు',
    cart: 'కార్ట్',
    profile: 'ప్రొఫైల్',

    // Menu items
    yourOrders: 'మీ ఆర్డర్లు',
    wallet: 'డిజిటల్ వాలెట్',
    referAndEarn: 'రిఫర్ & సంపాదించండి',
    savedAddresses: 'సేవ్ చేసిన చిరునామాలు',
    accountSettings: 'ఖాతా సెట్టింగ్లు',
    notifications: 'నోటిఫికేషన్లు',
    helpSupport: 'సహాయం & మద్దతు',
    appSettings: 'యాప్ సెట్టింగ్లు',
    offersPromoCodes: 'ఆఫర్లు & ప్రోమో కోడ్లు',
    languages: 'భాషలు',
    logout: 'లాగ్ అవుట్',
    login: 'సైన్ ఇన్',
    favorites: 'ఇష్టమైనవి',
    back: 'వెనుకకు',

    // Menu item descriptions
    yourOrdersDesc: 'ట్రాక్ చేయండి లేదా మళ్లీ కొనండి',
    walletDesc: 'మీ బ్యాలెన్స్ మరియు లావాదేవీలను తనిఖీ చేయండి',
    referAndEarnDesc: 'స్నేహితులను ఆహ్వానించండి, నగదు సంపాదించండి!',
    accountSettingsDesc: 'పాస్‌వర్డ్ & వ్యక్తిగత వివరాలను నిర్వహించండి',
    savedAddressesDesc: 'త్వరిత ఆర్డర్ కోసం చిరునామాలను సవరించండి',
    favoritesDesc: 'మీరు భద్రపరచిన వస్తువులను చూడండి',
    notificationsDesc: 'ఆఫర్లు మరియు ఆర్డర్ అప్‌డేట్‌లు',
    offersDesc: 'కూపన్లు, వోచర్లు & పండుగ ఆఫర్లు',
    languagesDesc: 'English, తెలుగు',
    appSettingsDesc: 'థీమ్, అక్షర పరిమాణం & అప్‌డేట్‌లు',
    logoutDesc: 'ఈ పరికరం నుండి సురక్షితంగా లాగ్ అవుట్ అవ్వండి',

    // App Settings terms
    appearance: 'రూపం',
    light: 'లైట్',
    dark: 'డార్క్',
    system: 'సిస్టమ్ డిఫాల్ట్',
    fontSize: 'ఫాంట్ పరిమాణం',
    normal: 'సాధారణం',
    large: 'పెద్దది',
    extraLarge: 'చాలా పెద్దది',
    appVersion: 'యాప్ వెర్షన్',
    checkForUpdates: 'అప్డేట్ల కోసం తనిఖీ చేయండి',
    checkingUpdates: 'అప్డేట్ల కోసం తనిఖీ చేస్తోంది...',
    upToDate: 'మీరు తాజా వెర్షన్లో ఉన్నారు!',
    appearanceHint: 'మీ పరికరంలో స్మార్ట్ కిరాణా రూపాన్ని అనుకూలీకరించండి.',
    fontSizeHint: 'సులభంగా చదవడానికి యాప్ అంతటా టెక్స్ట్ పరిమాణాన్ని మార్చండి.',
    previewTitle: 'లైవ్ ప్రివ్యూ',
    previewText: 'స్మార్ట్ కిరాణా తాజా కూరగాయలు, నిత్యావసర సరుకులను హోల్‌సేల్ ధరలకే మీ ఇంటి వద్దకు అందిస్తుంది.',

    // Offers terms
    availableOffers: 'అందుబాటులో ఉన్న ఆఫర్లు',
    copyCode: 'కోడ్ కాపీ చేయండి',
    copied: 'కాపీ చేయబడింది!',
    minOrder: 'కనిష్ట ఆర్డర్: ₹',
    validTill: 'చెల్లుబాటు: ',
    noOffers: 'ప్రస్తుతం ఎలాంటి ఆఫర్లు లేదా ప్రోమో కోడ్లు అందుబాటులో లేవు.',
    noOffersSub: 'తాజా కూపన్లు మరియు కిరాణా తగ్గింపుల కోసం తర్వాత మళ్లీ చూడండి!',
    expires: 'గడువు',
    maxDiscount: 'గరిష్ట తగ్గింపు: ₹',
    allCategories: 'అన్ని వస్తువులు',

    // Languages screen
    selectLanguage: 'భాషను ఎంచుకోండి',
    chooseLanguageSubtitle: 'షాపింగ్ చేయడానికి మీకు నచ్చిన భాషను ఎంచుకోండి',
    englishTitle: 'English (India)',
    englishSub: 'English (India)',
    teluguTitle: 'తెలుగు (India)',
    teluguSub: 'Telugu (India)',

    // Catalog & Search
    searchPlaceholder: 'వస్తువులను వెతకండి...',
    shopByCategory: 'కేటగిరీల వారీగా షాపింగ్ చేయండి',
    seeAll: 'అన్నీ చూడండి →',
    exploreCatalog: 'కేటలాగ్ చూడండి',
    popularSearches: 'ప్రముఖ శోధనలు',
    noProductsFound: 'వస్తువులు ఏవీ దొరకలేదు',
    clearFilters: 'ఫిల్టర్లను తొలగించండి / అన్నీ చూపించండి',
    addToCart: 'కార్ట్‌కు జోడించండి',
    outOfStock: 'స్టాక్ అయిపోయింది',
    freeDelivery: 'ఉచిత డెలివరీ',
    digitalWallet: 'డిజిటల్ వాలెట్',

    // Auth
    welcomeBack: 'స్వాగతం',
    createAccount: 'ఖాతా సృష్టించండి',
    forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా',
    resetPassword: 'పాస్‌వర్డ్ రీసెట్ చేయండి',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const STORAGE_LANG_KEY = 'sk_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    async function loadLanguage() {
      try {
        const savedLang = await getItem(STORAGE_LANG_KEY);
        if (savedLang === 'en' || savedLang === 'te') {
          setLanguageState(savedLang);
        }
      } catch (error) {
        console.error('Failed to load saved language:', error);
      }
    }
    loadLanguage();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveItem(STORAGE_LANG_KEY, lang);
  };

  const t = (key: string): string => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
