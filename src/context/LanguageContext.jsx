import React, { createContext, useContext, useState, useEffect } from 'react';

// Dil çevirileri
const translations = {
  uk: {
    home: 'Головна',
    dashboard: 'Панель',
    team: 'Команда',
    projects: 'Проєкти',
    calendar: 'Календар',
    documents: 'Документи',
    reports: 'Звіти',
    settings: 'Налаштування',
    theme: 'Тема',
    logout: 'Вийти',
    managementPanel: 'Панель управління',
    language: 'Мова',
    registration: 'Реєстрація',
    remainingUsage: 'Залишок занять',
    incomeExpense: 'Доходи/Витрати',
    waitlist: 'Список очікування',
    notes: 'Нотатки',
    ideaCenter: 'Центр ідей'
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
  // localStorage'dan kayıtlı dili al, yoksa varsayılan olarak 'uk'
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    // Eski sürümden kalan 'tr' tercihi artık desteklenmiyor, Ukraynacaya taşı
    if (!savedLanguage || savedLanguage === 'tr') return 'uk';
    return savedLanguage;
  });

  // Dil değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'uk' ? 'en' : 'uk');
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}; 