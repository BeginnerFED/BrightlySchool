import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
import Toast from './ui/Toast'
import DatePicker, { registerLocale } from 'react-datepicker'
import { tr } from 'date-fns/locale'
import "react-datepicker/dist/react-datepicker.css"
import { 
  XMarkIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  TagIcon,
  DocumentTextIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

// Türkçe lokalizasyonu kaydet
registerLocale('tr', tr)

// DatePicker özel stilleri
const datePickerStyles = `
  .react-datepicker-wrapper {
    width: 100%;
  }
  .react-datepicker {
    font-family: inherit;
    border: none;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    background-color: white;
  }
  .dark .react-datepicker {
    background-color: #121621;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  }
  .react-datepicker__header {
    background-color: white;
    border-bottom: 1px solid #d2d2d7;
    padding: 16px;
  }
  .dark .react-datepicker__header {
    background-color: #121621;
    border-bottom: 1px solid #2a3241;
  }
  .react-datepicker__current-month {
    color: #1d1d1f;
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 8px;
  }
  .dark .react-datepicker__current-month {
    color: white;
  }
  .react-datepicker__navigation {
    top: 16px;
  }
  .react-datepicker__navigation--previous {
    left: 16px;
  }
  .react-datepicker__navigation--next {
    right: 16px;
  }
  .react-datepicker__day-name {
    color: #6e6e73;
    font-weight: 500;
    font-size: 12px;
    margin: 4px;
    width: 32px;
    height: 32px;
    line-height: 32px;
  }
  .dark .react-datepicker__day-name {
    color: #86868b;
  }
  .react-datepicker__day {
    color: #1d1d1f;
    font-weight: 400;
    font-size: 13px;
    margin: 4px;
    width: 32px;
    height: 32px;
    line-height: 32px;
    border-radius: 8px;
    transition: all 0.2s;
  }
  .dark .react-datepicker__day {
    color: white;
  }
  .react-datepicker__day:hover {
    background-color: #f5f5f7;
    border-radius: 8px;
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
    background-color: #0071e3 !important;
    color: white !important;
    font-weight: 500;
  }
  .react-datepicker__day--outside-month {
    color: #6e6e73;
  }
  .dark .react-datepicker__day--outside-month {
    color: #86868b;
  }
  .react-datepicker__triangle {
    display: none;
  }
`

// Supabase istemcisini oluştur
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function CreateExpenses({ isOpen, onClose, onSuccess }) {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  })

  // Form verilerini başlat
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    date: new Date(),
    amount: '',
    paymentMethod: '',
    notes: ''
  })

  // Form verilerini sıfırla
  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      date: new Date(),
      amount: '',
      paymentMethod: '',
      notes: ''
    })
  }

  // Form validasyonu
  const isFormValid = () => {
    return (
      formData.title.trim() !== '' &&
      formData.category !== '' &&
      formData.date !== null &&
      formData.amount.trim() !== '' &&
      formData.paymentMethod !== ''
    )
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid()) return

    setIsLoading(true)
    try {
      // Gider kaydı oluştur
      const { error } = await supabase
        .from('expenses')
        .insert({
          expense_type: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.title.trim(),
          expense_date: formData.date.toISOString(),
          payment_method: formData.paymentMethod,
          notes: formData.notes.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      // Toast mesajını göster
      setToast({
        visible: true,
        message: language === 'tr' ? 'Gider kaydı başarıyla oluşturuldu.' : 'Expense record has been successfully created.',
        type: 'success'
      })

      // Formu sıfırla ve modalı kapat
      resetForm()
      onClose()
      onSuccess?.()

    } catch (error) {
      console.error('Gider kaydı oluşturulurken hata:', error.message)
      setToast({
        visible: true,
        message: language === 'tr' ? 'Gider kaydı oluşturulurken bir hata oluştu.' : 'An error occurred while creating the expense record.',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClasses = "w-full h-[50px] pl-11 pr-4 py-3 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all appearance-none"
  const iconClasses = "w-5 h-5 text-[#86868b] pointer-events-none flex-shrink-0"
  const iconWrapperClasses = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"

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

  if (!isOpen) return (
    <Toast 
      message={toast.message}
      type={toast.type}
      isVisible={toast.visible}
      onClose={() => setToast(prev => ({ ...prev, visible: false }))}
    />
  )

  return (
    <>
      <style>{datePickerStyles}</style>
      <style jsx="true">{`
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
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <div className="fixed inset-0 z-40 overflow-y-auto">
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
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Yeni Gider Kaydı' : 'New Expense Record'}
              </h2>
              <p className="mt-1 text-[#6e6e73] dark:text-[#86868b]">
                {language === 'tr' ? 'Lütfen gerekli bilgileri doldurun' : 'Please fill in the required information'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Sol Kolon */}
                <div className="space-y-4">
                  {/* Başlık */}
                  <div className="relative">
                    <div className={iconWrapperClasses}>
                      <DocumentTextIcon className={iconClasses} />
                    </div>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={(e) => {
                        const value = e.target.value
                        setFormData(prev => ({
                          ...prev,
                          title: value.charAt(0).toUpperCase() + value.slice(1)
                        }))
                      }}
                      className={inputClasses}
                      placeholder={language === 'tr' ? "Gider Başlığı" : "Expense Title"}
                      tabIndex={1}
                      autoComplete="off"
                    />
                  </div>

                  {/* Tarih */}
                  <DatePicker
                    selected={formData.date}
                    onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                    dateFormat="dd.MM.yyyy"
                    locale={language === 'tr' ? 'tr' : 'en'}
                    customInput={<CustomInput />}
                  />

                  {/* Kategori */}
                  <div className="relative">
                    <div className={iconWrapperClasses}>
                      <TagIcon className={iconClasses} />
                    </div>
                    <select 
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className={`${inputClasses} ${!formData.category && 'text-[#86868b]'}`}
                      tabIndex={3}
                      autoComplete="off"
                    >
                      <option value="" disabled className="text-[#86868b] dark:text-[#86868b] bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Kategori Seçin" : "Select Category"}
                      </option>
                      <option value="kira" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Kira" : "Rent"}
                      </option>
                      <option value="elektrik" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Elektrik" : "Electricity"}
                      </option>
                      <option value="su" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Su" : "Water"}
                      </option>
                      <option value="internet" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "İnternet" : "Internet"}
                      </option>
                      <option value="maas" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Maaş" : "Salary"}
                      </option>
                      <option value="malzeme" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Malzeme" : "Materials"}
                      </option>
                      <option value="mutfak" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Mutfak" : "Kitchen"}
                      </option>
                      <option value="reklam" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Reklam" : "Advertising"}
                      </option>
                      <option value="filament" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Filament" : "Filament"}
                      </option>
                      <option value="diger" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Diğer" : "Other"}
                      </option>
                    </select>
                  </div>
                </div>

                {/* Sağ Kolon */}
                <div className="space-y-4">
                  {/* Tutar */}
                  <div className="relative">
                    <div className={iconWrapperClasses}>
                      <CurrencyDollarIcon className={iconClasses} />
                    </div>
                    <input
                      type="text"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className={`${inputClasses} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      placeholder={language === 'tr' ? "0.00 ₺" : "0.00 ₺"}
                      tabIndex={4}
                      autoComplete="off"
                      onKeyPress={(e) => {
                        if (!/[\d.]/.test(e.key)) {
                          e.preventDefault()
                        }
                        if (e.key === '.' && e.target.value.includes('.')) {
                          e.preventDefault()
                        }
                      }}
                      onWheel={(e) => e.target.blur()}
                    />
                  </div>

                  {/* Ödeme Yöntemi */}
                  <div className="relative">
                    <div className={iconWrapperClasses}>
                      <BanknotesIcon className={iconClasses} />
                    </div>
                    <select 
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      className={`${inputClasses} ${!formData.paymentMethod && 'text-[#86868b]'}`}
                      tabIndex={5}
                      autoComplete="off"
                    >
                      <option value="" disabled className="text-[#86868b] dark:text-[#86868b] bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Ödeme Yöntemi Seçin" : "Select Payment Method"}
                      </option>
                      <option value="banka" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Banka" : "Bank"}
                      </option>
                      <option value="nakit" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Nakit" : "Cash"}
                      </option>
                      <option value="kart" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Kredi Kartı" : "Credit Card"}
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
                      name="notes"
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
                      tabIndex={6}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    onClose()
                  }}
                  className="w-full h-11 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#161616] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-[#2a2a2a] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                  tabIndex={7}
                  disabled={isLoading}
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-full h-11 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  tabIndex={8}
                  disabled={!isFormValid() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{language === 'tr' ? 'Kaydediliyor' : 'Saving'}</span>
                    </>
                  ) : (
                    language === 'tr' ? 'Kaydet' : 'Save'
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