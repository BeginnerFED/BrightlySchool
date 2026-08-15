import React from 'react';
import { 
  GlobeAltIcon,
  SunIcon,
  MoonIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const Settings = () => {
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  // Kategori kartları içeren bileşen
  const SettingCategory = ({ icon, title, children }) => (
    <div className="mb-10">
      <div className="flex items-center space-x-3 mb-6 pb-2">
        <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800">
          {icon}
        </div>
        <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );

  // Ayar kartı bileşeni 
  const SettingCard = ({ title, children }) => (
    <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-[#2a3241] hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all duration-300">
      <div className="mb-4">
        <h4 className="font-medium text-[#1d1d1f] dark:text-white">{title}</h4>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="py-4 px-6 border-b border-gray-200 dark:border-[#2a3241]">
        <h2 className="text-xl font-medium text-[#1d1d1f] dark:text-white">
          {language === 'tr' ? 'Ayarlar' : 'Settings'}
        </h2>
      </div>

      {/* Settings Content */}
      <div className="px-6 py-6">
        
          {/* Görünüm Ayarları Kategorisi */}
          <SettingCategory 
            icon={<SunIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />} 
            title={language === 'tr' ? 'Görünüm Ayarları' : 'Appearance Settings'}
          >
            {/* Dil Seçimi Kartı */}
            <SettingCard 
              title={t('language')}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'tr' ? 'Şu anda kullanılan dil' : 'Current language'}
                </p>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {language === 'tr' ? 'Türkçe' : 'English'}
                </span>
              </div>
              
              <div className="pt-3">
                <button
                  onClick={toggleLanguage}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-gray-50 dark:bg-[#242b3d] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2d364a] border border-gray-200 dark:border-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {language === 'tr' ? 'Switch to English' : 'Türkçe\'ye Geç'}
                </button>
              </div>
            </SettingCard>

            {/* Tema Seçimi Kartı */}
            <SettingCard 
              title={t('theme')}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'tr' ? 'Aktif tema' : 'Active theme'}
                </p>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {isDark 
                    ? (language === 'tr' ? 'Koyu Tema' : 'Dark Theme') 
                    : (language === 'tr' ? 'Açık Tema' : 'Light Theme')}
                </span>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div 
                  onClick={() => isDark && toggleTheme()}
                  className={`flex-1 py-2.5 px-3 mr-2 rounded-lg flex flex-col items-center ${!isDark ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 border-2' : 'bg-gray-50 dark:bg-[#242b3d] border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2d364a]'} transition-all duration-200`}
                >
                  <SunIcon className={`w-5 h-5 mb-1 ${!isDark ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  <span className={`text-xs font-medium ${!isDark ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {language === 'tr' ? 'Açık' : 'Light'}
                  </span>
                </div>
                <div 
                  onClick={() => !isDark && toggleTheme()}
                  className={`flex-1 py-2.5 px-3 rounded-lg flex flex-col items-center ${isDark ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 border-2' : 'bg-gray-50 dark:bg-[#242b3d] border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2d364a]'} transition-all duration-200`}
                >
                  <MoonIcon className={`w-5 h-5 mb-1 ${isDark ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  <span className={`text-xs font-medium ${isDark ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {language === 'tr' ? 'Koyu' : 'Dark'}
                  </span>
                </div>
              </div>
            </SettingCard>
          </SettingCategory>

          {/* Uygulama Bilgisi Kategorisi */}
          <SettingCategory 
            icon={<InformationCircleIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />} 
            title={language === 'tr' ? 'Uygulama Bilgisi' : 'Application Information'}
          >
            {/* Versiyon Bilgisi Kartı */}
            <SettingCard 
              title={language === 'tr' ? 'Versiyon Bilgisi' : 'Version Information'}
            >
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'tr' ? 'Uygulama Versiyonu' : 'Application Version'}
                </span>
                <span className="text-sm text-gray-900 dark:text-white font-medium px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded">1.0.12</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'tr' ? 'Son Güncelleme' : 'Last Update'}
                </span>
                <span className="text-sm text-gray-900 dark:text-white">05.07.2025</span>
              </div>
            </SettingCard>
          </SettingCategory>
      </div>
    </div>
  );
};

export default Settings; 