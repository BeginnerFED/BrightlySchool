import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  CalendarDaysIcon, 
  UserPlusIcon, 
  ChartBarIcon,
  BanknotesIcon, 
  QueueListIcon, 
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { FaChild } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

const Sidebar = ({ onClose }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [userInitials, setUserInitials] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        // Email adresinden baş harfleri al
        const initials = user.email
          .split('@')[0] // @ işaretinden önceki kısmı al
          .match(/\b\w/g) // Kelimelerin ilk harflerini al
          .join('') // Harfleri birleştir
          .toUpperCase(); // Büyük harfe çevir
        setUserInitials(initials);
      }
    };
    
    getUser();
  }, []);

  const menuItems = [
    { icon: HomeIcon, text: 'home', path: '/' },
    { icon: CalendarDaysIcon, text: 'calendar', path: '/calendar' },
    { icon: UserPlusIcon, text: 'registration', path: '/registration' },
    { icon: ChartBarIcon, text: 'remainingUsage', path: '/remaining-usage' },
    { icon: BanknotesIcon, text: 'incomeExpense', path: '/income-expense' },
    { icon: QueueListIcon, text: 'waitlist', path: '/waitlist' },
    { icon: DocumentTextIcon, text: 'notes', path: '/notes' },
    { icon: LightBulbIcon, text: 'ideaCenter', path: '/idea-center' },
  ];

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error.message);
    }
  };

  return (
    <div className={`min-w-[256px] max-w-[256px] h-screen overflow-y-auto flex flex-col bg-[#f6f7f9] dark:bg-[#121621] text-gray-800 dark:text-white transition-colors duration-300`}>
      {/* Close Button - Only visible on mobile */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#161b2c] transition-colors duration-300"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>

      <div className="p-4 flex flex-col h-full">
        {/* Logo */}
        <div className="mb-8 min-h-[48px] flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 transition-colors duration-300`}>
              <FaChild className={`w-6 h-6 text-indigo-600 dark:text-indigo-400 transition-colors duration-300`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`text-xl font-bold text-indigo-600 dark:text-indigo-400 transition-colors duration-300 truncate`}>Hello Kido</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 truncate">{t('managementPanel')}</span>
            </div>
          </div>
        </div>

        {/* Main Menu */}
        <nav className="space-y-2 flex-shrink-0">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              onClick={() => onClose()}
              className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#161b2c] transition-colors duration-300 group ${
                location.pathname === item.path ? 'bg-gray-200 dark:bg-[#161b2c]' : ''
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{t(item.text)}</span>
            </Link>
          ))}
        </nav>

        {/* Settings and User Profile */}
        <div className="mt-auto space-y-3 flex-shrink-0">
          {/* Settings */}
          <Link
            to="/settings"
            className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#161b2c] transition-colors duration-300 ${
              location.pathname === '/settings' ? 'bg-gray-200 dark:bg-[#161b2c]' : ''
            }`}
            onClick={() => onClose()}
          >
            <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{t('settings')}</span>
          </Link>

          {/* User Profile */}
          <div className="pt-4 border-t border-[#d2d2d7]/60 dark:border-[#424245]">
            <div className={`flex items-center justify-between p-2 rounded-lg transition-colors duration-300`}>
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 transition-colors duration-300 flex-shrink-0`}>
                  {userInitials || 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {userEmail.split('@')[0]
                      .split(/[._-]/) // nokta, alt çizgi veya tire ile ayır
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 truncate">{userEmail}</span>
                </div>
              </div>
              <div className="group relative flex-shrink-0 ml-2">
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#161b2c] transition-colors duration-300"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50">
                  <div className="bg-gray-800 text-white text-sm py-1 px-2 rounded shadow-lg whitespace-nowrap">
                    {t('logout')}
                  </div>
                  <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-800 transform rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 