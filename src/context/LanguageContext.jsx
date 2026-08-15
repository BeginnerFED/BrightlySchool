import React, { createContext, useContext, useState, useEffect } from 'react';

// Dil çevirileri
const translations = {
  tr: {
    home: 'Anasayfa',
    dashboard: 'Panel',
    team: 'Ekip',
    projects: 'Projeler',
    calendar: 'Takvim',
    documents: 'Dökümanlar',
    reports: 'Raporlar',
    settings: 'Ayarlar',
    theme: 'Tema',
    logout: 'Çıkış Yap',
    managementPanel: 'Yönetim Paneli',
    language: 'Dil',
    registration: 'Kayıt',
    remainingUsage: 'Kalan Kullanım',
    incomeExpense: 'Gelir/Gider',
    waitlist: 'Bekleme Listesi',
    notes: 'Notlar',
    ideaCenter: 'Fikir Merkezi'
  },
  en: {
    home: 'Home',
    dashboard: 'Dashboard',
    team: 'Team',
    projects: 'Projects',
    calendar: 'Calendar',
    documents: 'Documents',
    reports: 'Reports',
    settings: 'Settings',
    theme: 'Theme',
    logout: 'Logout',
    managementPanel: 'Management Panel',
    language: 'Language',
    registration: 'Registration',
    remainingUsage: 'Remaining Usage',
    incomeExpense: 'Income/Expense',
    waitlist: 'Waitlist',
    notes: 'Notes',
    ideaCenter: 'Idea Center'
  }
};

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  // localStorage'dan kayıtlı dili al, yoksa varsayılan olarak 'tr'
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'tr';
  });

  // Dil değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'tr' ? 'en' : 'tr');
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}; 