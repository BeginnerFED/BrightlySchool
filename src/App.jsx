import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import Registration from './pages/Registration'
import RemainingUsage from './pages/RemainingUsage'
import IncomeExpense from './pages/IncomeExpense'
import Waitlist from './pages/Waitlist'
import Notes from './pages/Notes'
import Settings from './pages/Settings'
import Login from './pages/Login'
import IdeaCenter from './pages/IdeaCenter'
import PublicCalendar from './pages/PublicCalendar'
import ProtectedRoute from './components/ProtectedRoute'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider } from './context/AuthContext'
import { FiMenu } from 'react-icons/fi'
import './App.css'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // İlk yükleme kontrolü
    checkIfMobile();

    // Resize event listener
    window.addEventListener('resize', checkIfMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleSidebarClose = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <div className="flex min-h-screen bg-[#f6f7f9] dark:bg-[#121621] transition-colors duration-300">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/takvim" element={<PublicCalendar />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <div className="flex w-full h-screen overflow-hidden">
                        {/* Sidebar Container */}
                        <div className={`
                          fixed lg:relative h-full z-40
                          ${isSidebarOpen || !isMobile ? 'w-64' : 'w-0'}
                          transition-all duration-300 ease-in-out
                          bg-[#f6f7f9] dark:bg-[#121621]
                        `}>
                          <div className="h-full overflow-y-auto">
                            <Sidebar onClose={handleSidebarClose} />
                          </div>
                        </div>

                        {/* Main Content */}
                        <main className={`
                          flex-1 h-full overflow-y-auto
                          transition-all duration-300
                          ${isMobile ? 'w-full pb-[50px]' : 'w-[calc(100%-256px)] pb-[30px]'}
                          ${isMobile && isSidebarOpen ? 'overflow-hidden' : ''}
                          m-[10px_10px_10px_10px] lg:m-[15px_10px_15px_0px]
                        `}>
                          {/* Mobile Navbar */}
                          <div className="lg:hidden sticky top-0 z-20 mb-3">
                            <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#E2E4E9] dark:border-[#2a3241]">
                              <div className="h-14 px-4 flex items-center">
                                <button
                                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                  className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
                                >
                                  <FiMenu className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-[#1a1f2e] border border-[#E2E4E9] dark:border-[#2a3241] rounded-xl min-h-[calc(100%-0px)]">
                            {/* Routes */}
                            <Routes>
                              <Route path="/" element={<Home />} />
                              <Route path="/calendar" element={<Calendar />} />
                              <Route path="/registration" element={<Registration />} />
                              <Route path="/remaining-usage" element={<RemainingUsage />} />
                              <Route path="/income-expense" element={<IncomeExpense />} />
                              <Route path="/waitlist" element={<Waitlist />} />
                              <Route path="/notes" element={<Notes />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/idea-center" element={<IdeaCenter />} />
                            </Routes>
                          </div>
                        </main>

                        {/* Overlay for mobile */}
                        {isSidebarOpen && isMobile && (
                          <div
                            className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300"
                            onClick={handleSidebarClose}
                          />
                        )}
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
