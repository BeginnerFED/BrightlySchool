import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
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

export default function UpdateExpensesModal({ isOpen, onClose, expense, onUpdate }) {
  const { language } = useLanguage()
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    amount: '',
    payment_method: '',
    notes: '',
    expense_date: new Date()
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title || '',
        category: expense.category || '',
        amount: expense.amount || '',
        payment_method: expense.method || '',
        notes: expense.notes || '',
        expense_date: expense.date ? new Date(expense.date) : new Date()
      })
    }
  }, [expense])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('expenses')
        .update({
          description: formData.title.trim(),
          expense_type: formData.category,
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          notes: formData.notes.trim() || null,
          expense_date: formData.expense_date.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', expense.id)

      if (updateError) throw updateError

      onUpdate()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const inputClasses = "w-full h-[50px] pl-11 pr-4 py-3 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
  const iconClasses = "w-5 h-5 text-[#86868b]"
  const iconWrapperClasses = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"

  // DatePicker özel input
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
      <style>{datePickerStyles}</style>
      <div className="fixed inset-0 z-40 overflow-y-auto">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity"
          onClick={onClose}
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
                {language === 'tr' ? 'Gider Düzenle' : 'Edit Expense'}
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
                      required
                    />
                  </div>

                  {/* Tarih */}
                  <DatePicker
                    selected={formData.expense_date}
                    onChange={(date) => setFormData(prev => ({ ...prev, expense_date: date }))}
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
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className={`${inputClasses} ${!formData.category && 'text-[#86868b]'}`}
                      required
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
                      {formData.category === 'dogalgaz' && (
                        <option value="dogalgaz" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                          {language === 'tr' ? "Doğalgaz" : "Natural Gas"}
                        </option>
                      )}
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
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className={`${inputClasses} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      placeholder={language === 'tr' ? "0.00 ₺" : "0.00 ₺"}
                      required
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
                      value={formData.payment_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className={`${inputClasses} ${!formData.payment_method && 'text-[#86868b]'}`}
                      required
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
                    />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 text-sm text-red-500">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-11 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#161616] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-[#2a2a2a] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                  disabled={isLoading}
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-full h-11 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{language === 'tr' ? 'Güncelleniyor...' : 'Updating...'}</span>
                    </>
                  ) : (
                    language === 'tr' ? 'Güncelle' : 'Update'
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