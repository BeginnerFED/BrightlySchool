import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { FaChild } from 'react-icons/fa'
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline'

// Hata mesajlarını Türkçe'ye çeviren fonksiyon
const translateError = (error) => {
  const errorMessages = {
    'Invalid login credentials': 'Geçersiz email veya şifre',
    'Email not confirmed': 'Email adresi onaylanmamış',
    'Invalid email or password': 'Geçersiz email veya şifre',
    'Email already registered': 'Bu email adresi zaten kayıtlı',
    'Invalid email': 'Geçersiz email adresi',
    'User not found': 'Kullanıcı bulunamadı',
    'Password is too short': 'Şifre çok kısa',
    'Password is too weak': 'Şifre çok zayıf',
    'Password is required': 'Şifre gerekli',
    'Email is required': 'Email gerekli',
    'Something went wrong': 'Bir hata oluştu',
    'Network error': 'Bağlantı hatası',
    'Server error': 'Sunucu hatası',
    'Too many requests': 'Çok fazla deneme yapıldı, lütfen daha sonra tekrar deneyin',
    'Invalid or expired token': 'Geçersiz veya süresi dolmuş token',
    'Rate limit exceeded': 'İstek limiti aşıldı, lütfen daha sonra tekrar deneyin'
  }

  // Hata mesajı eşleşmesi varsa çeviriyi, yoksa genel hata mesajını döndür
  return errorMessages[error] || 'Bir hata oluştu, lütfen tekrar deneyin'
}

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: rememberMe
        }
      })
      
      if (error) throw error
      navigate('/')
    } catch (error) {
      setError(translateError(error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#1a1a1a] transition-colors duration-300">
      <div className="w-full max-w-[400px] mx-auto px-4">
        {/* Logo ve Başlık */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-[28px] bg-white dark:bg-[#2a2a2a] shadow-lg transition-all duration-300 transform hover:scale-105">
              <FaChild className="w-14 h-14 text-[#007AFF] dark:text-[#0A84FF]" />
            </div>
          </div>
          <h1 className="text-[32px] font-semibold text-[#1d1d1f] dark:text-white mb-3 tracking-tight">
            Hello Kido
          </h1>
          <p className="text-[17px] text-[#6e6e73] dark:text-[#86868b]">
            Yönetim Paneline Hoş Geldiniz
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)] p-8 mb-6 transition-all duration-300">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[15px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                Email Adresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-[#86868b]" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-[#d2d2d7] dark:border-[#424245] rounded-xl focus:ring-2 focus:ring-[#0071e3] focus:border-transparent dark:focus:ring-[#0A84FF] bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white placeholder-[#86868b] transition-all duration-300"
                  placeholder="ornek@sirket.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[15px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-[#86868b]" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-[#d2d2d7] dark:border-[#424245] rounded-xl focus:ring-2 focus:ring-[#0071e3] focus:border-transparent dark:focus:ring-[#0A84FF] bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white placeholder-[#86868b] transition-all duration-300"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Beni Hatırla Checkbox */}
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 rounded-md border-[#d2d2d7] dark:border-[#424245] peer-checked:border-[#007AFF] dark:peer-checked:border-[#0A84FF] transition-colors duration-300"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity duration-300">
                    <svg className="w-3 h-3 text-[#007AFF] dark:text-[#0A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-[15px] text-[#1d1d1f] dark:text-white group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors duration-300">
                  Beni Hatırla
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-[#fff2f2] dark:bg-[#3b2829] text-[#ff3b30] dark:text-[#ff453a] text-[15px] rounded-xl p-4 transition-all duration-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center h-12 px-4 border-0 rounded-xl text-[17px] font-medium text-white bg-[#007AFF] hover:bg-[#0071e3] dark:bg-[#0A84FF] dark:hover:bg-[#0071e3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] dark:focus:ring-offset-[#1d1d1f] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Giriş yapılıyor...</span>
                </div>
              ) : (
                <span>Giriş Yap</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-[13px] text-[#86868b]">
          Hello Kido Yönetim Paneli © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
} 