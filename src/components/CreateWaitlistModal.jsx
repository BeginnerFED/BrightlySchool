import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
import DatePicker, { registerLocale } from 'react-datepicker'
import { tr } from 'date-fns/locale'
import "react-datepicker/dist/react-datepicker.css"
import { 
  XMarkIcon,
  FaceSmileIcon,
  UsersIcon,
  PhoneIcon,
  CakeIcon,
  CubeIcon,
  CalendarDaysIcon,
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

// Türkçe lokalizasyonu kaydet
registerLocale('tr', tr)

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function CreateWaitlistModal({ isOpen, onClose, onSuccess }) {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    parent_name: '',
    parent_phone: '',
    student_name: '',
    student_age: '',
    package_type: '',
    contact_date: new Date(),
    status: '',
    notes: ''
  })

  // Form validasyonu için state
  const [isFormValid, setIsFormValid] = useState(false)

  // Form validasyonunu kontrol et
  useEffect(() => {
    const isValid = 
      formData.parent_name.trim() !== '' &&
      formData.parent_phone.trim() !== '' &&
      formData.student_name.trim() !== '' &&
      formData.student_age.trim() !== '' &&
      formData.package_type !== '' &&
      formData.contact_date !== null &&
      formData.status !== ''

    setIsFormValid(isValid)
  }, [formData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isFormValid) {
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{
          ...formData,
          contact_date: formData.contact_date.toISOString().split('T')[0]
        }])

      if (error) throw error

      const successMessage = language === 'tr' 
        ? 'Bekleme listesine başarıyla eklendi.' 
        : 'Successfully added to waitlist.'

      onSuccess?.(successMessage, 'success')
      onClose()
      setFormData({
        parent_name: '',
        parent_phone: '',
        student_name: '',
        student_age: '',
        package_type: '',
        contact_date: new Date(),
        status: '',
        notes: ''
      })
    } catch (error) {
      console.error('Kayıt eklenirken hata:', error.message)
      const errorMessage = language === 'tr'
        ? 'Kayıt eklenirken bir hata oluştu.'
        : 'An error occurred while adding the entry.'
      onSuccess?.(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClasses = "w-full h-[46px] pl-11 pr-4 rounded-xl border border-[#e5e5e5] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm appearance-none"
  const iconClasses = "w-5 h-5 text-[#86868b] pointer-events-none flex-shrink-0"
  const iconWrapperClasses = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10"

  // DatePicker özel stil
  const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
    <div className="relative w-full">
      <div className={iconWrapperClasses}>
        <CalendarDaysIcon className={iconClasses} />
      </div>
      <input
        type="text"
        ref={ref}
        onClick={onClick}
        value={value}
        readOnly
        className={`${inputClasses} cursor-pointer`}
        placeholder={language === 'tr' ? "Tarih Seçin" : "Select Date"}
      />
    </div>
  ))

  if (!isOpen) return null

  return (
    <>
      <style>
        {`
          .react-datepicker-wrapper {
            width: 100%;
            display: block;
          }
          .react-datepicker {
            font-family: inherit;
            border: none;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 0 0 1px #e5e5e5, 0 8px 16px -4px rgba(0, 0, 0, 0.1);
            background-color: white;
            margin-top: 8px;
          }
          .dark .react-datepicker {
            background-color: #121621;
            box-shadow: 0 0 0 1px #2a3241, 0 8px 16px -4px rgba(0, 0, 0, 0.3);
          }
          .react-datepicker__header {
            background-color: white;
            border-bottom: 1px solid #e5e5e5;
            padding: 16px;
          }
          .dark .react-datepicker__header {
            background-color: #121621;
            border-color: #2a3241;
          }
          .react-datepicker__current-month {
            color: #1d1d1f;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .dark .react-datepicker__current-month {
            color: white;
          }
          .react-datepicker__day-names {
            margin-top: 8px;
          }
          .react-datepicker__day-name {
            color: #86868b;
            font-size: 12px;
            width: 36px;
            height: 36px;
            line-height: 36px;
            margin: 0;
          }
          .react-datepicker__month {
            margin: 0;
            padding: 12px;
          }
          .react-datepicker__day {
            color: #1d1d1f;
            font-size: 13px;
            width: 36px;
            height: 36px;
            line-height: 36px;
            margin: 0;
            border-radius: 50%;
          }
          .dark .react-datepicker__day {
            color: white;
          }
          .react-datepicker__day:hover {
            background-color: #f5f5f7;
            border-radius: 50%;
          }
          .dark .react-datepicker__day:hover {
            background-color: #2a3241;
          }
          .react-datepicker__day--selected {
            background-color: #0071e3 !important;
            color: white !important;
            font-weight: 500;
          }
          .react-datepicker__day--keyboard-selected {
            background-color: #0071e3;
            color: white;
            font-weight: 500;
          }
          .react-datepicker__day--outside-month {
            color: #86868b;
            opacity: 0.5;
          }
          .react-datepicker__navigation {
            top: 18px;
            width: 24px;
            height: 24px;
          }
          .react-datepicker__navigation--previous {
            left: 16px;
          }
          .react-datepicker__navigation--next {
            right: 16px;
          }
          .react-datepicker__navigation-icon::before {
            border-color: #86868b;
            border-width: 2px 2px 0 0;
            width: 8px;
            height: 8px;
          }
          .react-datepicker__navigation:hover *::before {
            border-color: #1d1d1f;
          }
          .dark .react-datepicker__navigation:hover *::before {
            border-color: white;
          }
          .react-datepicker-popper {
            z-index: 100;
          }
        `}
      </style>
      <style jsx>{`
        /* Cross-browser compatibility for select elements */
        select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2386868B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
          background-position: right 0.75rem center;
          background-repeat: no-repeat;
          background-size: 1.25em;
          padding-right: 2.5rem;
        }
        
        /* Fix icon positioning for Safari */
        .icon-wrapper {
          -webkit-transform: translateY(-50%);
          transform: translateY(-50%);
        }
        
        /* Fix dropdown for mobile */
        @media (max-width: 768px) {
          select {
            padding-right: 2.5rem;
            text-overflow: ellipsis;
          }
          
          /* iOS specific fixes */
          input, select {
            font-size: 16px; /* Prevents iOS zoom on focus */
          }
        }
        
        /* Normalize form controls across browsers */
        input, select, button {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        
        /* Safari specific fixes */
        @supports (-webkit-touch-callout: none) {
          input, select {
            border-radius: 11px;
          }
          
          /* Fix for iOS date inputs */
          input[type="text"] {
            line-height: normal;
          }
        }
        
        /* SVG icon fixes for cross-browser compatibility */
        svg {
          display: inline-block;
          vertical-align: middle;
          overflow: visible;
        }
      `}</style>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity"
        />

        {/* Modal */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <div 
            className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-[#121621] p-6 shadow-xl transition-all"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Yeni Kayıt' : 'New Entry'}
              </h2>
              <p className="mt-1 text-[#6e6e73] dark:text-[#86868b]">
                {language === 'tr' ? 'Lütfen gerekli bilgileri doldurun' : 'Please fill in the required information'}
              </p>
            </div>

            {/* Form */}
            <form 
              className="grid md:grid-cols-2 grid-cols-1 gap-x-6 gap-y-4"
              onSubmit={handleSubmit}
            >
              {/* Sol Kolon */}
              <div className="space-y-4">
                {/* Veli İsmi */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <UsersIcon className={iconClasses} />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.parent_name}
                    onChange={(e) => {
                      const words = e.target.value.split(' ')
                      const capitalizedWords = words.map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      )
                      setFormData(prev => ({
                        ...prev,
                        parent_name: capitalizedWords.join(' ')
                      }))
                    }}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Veli İsmi" : "Parent Name"}
                    tabIndex={1}
                    autoComplete="off"
                  />
                </div>

                {/* Telefon Numarası */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <PhoneIcon className={iconClasses} />
                  </div>
                  <input
                    type="tel"
                    required
                    value={formData.parent_phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setFormData(prev => ({
                        ...prev,
                        parent_phone: value
                      }))
                    }}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Telefon Numarası" : "Phone Number"}
                    tabIndex={2}
                    autoComplete="off"
                  />
                </div>

                {/* Çocuk Adı */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <FaceSmileIcon className={iconClasses} />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.student_name}
                    onChange={(e) => {
                      const words = e.target.value.split(' ')
                      const capitalizedWords = words.map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      )
                      setFormData(prev => ({
                        ...prev,
                        student_name: capitalizedWords.join(' ')
                      }))
                    }}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Öğrenci İsmi" : "Student Name"}
                    tabIndex={3}
                    autoComplete="off"
                  />
                </div>

                {/* Yaş/Aylık */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <CakeIcon className={iconClasses} />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.student_age}
                    onChange={(e) => {
                      const words = e.target.value.split(' ')
                      const capitalizedWords = words.map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      setFormData(prev => ({
                        ...prev,
                        student_age: capitalizedWords.join(' ')
                      }))
                    }}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Yaş/Aylık - Örn:24 Aylık / 2 Yaş" : "Age/Months - Ex:24 Months / 2 Years"}
                    tabIndex={4}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Sağ Kolon */}
              <div className="space-y-4">
                {/* Paket Türü */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <CubeIcon className={iconClasses} />
                  </div>
                  <select 
                    required
                    value={formData.package_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, package_type: e.target.value }))}
                    className={`${inputClasses} ${!formData.package_type && 'text-[#86868b]'}`}
                    tabIndex={5}
                    autoComplete="off"
                  >
                    <option value="" disabled className="text-[#86868b] dark:text-[#86868b] bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "İlgilenilen Paket Türü" : "Interested Package Type"}
                    </option>
                    <option value="belirsiz" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "Belirsiz" : "Uncertain"}
                    </option>
                    <option value="tek-seferlik" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "Tek Seferlik Katılım" : "One Time Participation"}
                    </option>
                    <option value="hafta-1" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "Haftada 1 Gün" : "1 Day Per Week"}
                    </option>
                    <option value="hafta-2" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "Haftada 2 Gün" : "2 Days Per Week"}
                    </option>
                    <option value="hafta-3" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "Haftada 3 Gün" : "3 Days Per Week"}
                    </option>
                    <option value="hafta-4" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "Haftada 4 Gün" : "4 Days Per Week"}
                    </option>
                  </select>
                </div>

                {/* Aranılan Tarih */}
                <DatePicker
                  selected={formData.contact_date}
                  onChange={(date) => setFormData(prev => ({ ...prev, contact_date: date }))}
                  dateFormat="dd.MM.yyyy"
                  locale={language === 'tr' ? 'tr' : 'en'}
                  customInput={<CustomInput />}
                  minDate={new Date('2024-01-01')}
                  maxDate={new Date('2025-12-31')}
                  showPopperArrow={false}
                  required
                />

                {/* Durum */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <ClockIcon className={iconClasses} />
                  </div>
                  <select 
                    required
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className={`${inputClasses} ${!formData.status && 'text-[#86868b]'}`}
                    tabIndex={7}
                    autoComplete="off"
                  >
                    <option value="" disabled className="text-[#86868b] dark:text-[#86868b] bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "Durum" : "Status"}
                    </option>
                    <option value="beklemede" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "Beklemede" : "Waiting"}
                    </option>
                    <option value="iletisime-gecildi" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'tr' ? "İletişime Geçildi" : "Contacted"}
                    </option>
                  </select>
                </div>

                {/* Notlar */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <PencilSquareIcon className={iconClasses} />
                  </div>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        notes: value.charAt(0).toUpperCase() + value.slice(1)
                      }))
                    }}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Not ekle..." : "Add note..."}
                    tabIndex={8}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-11 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#161616] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-[#2a2a2a] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                  tabIndex={9}
                  disabled={isLoading}
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-full h-11 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  tabIndex={10}
                  disabled={!isFormValid || isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{language === 'tr' ? 'Kayıt Oluşturuluyor' : 'Creating Record'}</span>
                    </>
                  ) : (
                    language === 'tr' ? 'Kayıt Oluştur' : 'Create Record'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
} 