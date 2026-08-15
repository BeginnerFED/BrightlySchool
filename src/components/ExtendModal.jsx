import React, { useState, useEffect, useRef } from 'react'
import { DateRange } from 'react-date-range'
import { tr } from 'date-fns/locale'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import { createClient } from '@supabase/supabase-js'
import Toast from './ui/Toast'
import { useLanguage } from '../context/LanguageContext'
import { 
  XMarkIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  CubeIcon
} from '@heroicons/react/24/outline'

// Supabase istemcisini oluştur
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function ExtendModal({ isOpen, onClose, onSuccess, registration, isEditMode = false, existingExtension = null }) {
  const { language } = useLanguage()
  const datePickerRef = useRef(null)
  const paymentDatePickerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isPaymentDatePickerOpen, setIsPaymentDatePickerOpen] = useState(false)

  // Form state'lerini tanımla
  const [formData, setFormData] = useState({
    packageType: '',
    paymentStatus: 'odendi', // Varsayılan: ödendi
    paymentMethod: '',
    amount: '',
    note: '',
    paymentDate: null // Varsayılan olarak null
  })

  // Tarih aralığı için state tanımla
  const [dateRange, setDateRange] = useState([{
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    key: 'selection'
  }])

  // Modal açıldığında formu güncelle
  useEffect(() => {
    if (isOpen && registration) {
      if (isEditMode && existingExtension) {
        // Edit modu: mevcut uzatma verilerini forma yükle
        setDateRange([{
          startDate: new Date(existingExtension.new_start_date || existingExtension.previous_end_date),
          endDate: new Date(existingExtension.new_end_date),
          key: 'selection'
        }])
        setFormData({
          packageType: existingExtension.new_package_type,
          paymentStatus: existingExtension.payment_status || 'odendi',
          paymentMethod: existingExtension.payment_status === 'beklemede' ? '' : (existingExtension.payment_method || ''),
          amount: existingExtension.payment_status === 'beklemede' ? '' : (existingExtension.payment_amount?.toString() || ''),
          note: existingExtension.notes || '',
          paymentDate: existingExtension.payment_date ? new Date(existingExtension.payment_date) : null
        })
      } else {
        // Create modu: son paket bitişini başlangıç olarak öner
        const lastEndDate = new Date(registration.package_end_date)
        const suggestedStartDate = new Date(lastEndDate)

        setDateRange([{
          startDate: suggestedStartDate,
          endDate: suggestedStartDate,
          key: 'selection'
        }])

        setFormData({
          packageType: registration.package_type,
          paymentStatus: 'odendi',
          paymentMethod: '',
          amount: '',
          note: '',
          paymentDate: null
        })
      }
    }
  }, [isOpen, registration, isEditMode, existingExtension])

  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        packageType: '',
        paymentStatus: 'odendi',
        paymentMethod: '',
        amount: '',
        note: '',
        paymentDate: null // Varsayılan olarak null
      })
      setDateRange([{
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        key: 'selection'
      }])
      setIsCalendarOpen(false)
      setIsPaymentDatePickerOpen(false)
    }
  }, [isOpen])

  // Dışarı tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsCalendarOpen(false)
      }
      if (paymentDatePickerRef.current && !paymentDatePickerRef.current.contains(event.target)) {
        setIsPaymentDatePickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const inputClasses = "w-full h-[50px] pl-11 pr-4 py-3 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
  const iconClasses = "w-5 h-5 text-[#86868b]"
  const iconWrapperClasses = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"

  // Tarihi formatlama fonksiyonu
  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Input değişiklikleri için handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      // Eğer ödeme durumu "beklemede" olarak değiştirilirse, ödeme yeri, tutarını ve ödeme tarihini temizle
      if (name === 'paymentStatus' && value === 'beklemede') {
        return {
          ...prev,
          [name]: value,
          paymentMethod: '',
          amount: '',
          paymentDate: null // Ödeme tarihi null olarak ayarlanır
        }
      }
      
      // Eğer ödeme durumu "odendi" olarak değiştirilirse, ödeme yöntemini sıfırla
      if (name === 'paymentStatus' && value === 'odendi') {
        return {
          ...prev,
          [name]: value,
          paymentMethod: '',
          paymentDate: null // Otomatik bugün atamayı kaldırdık
        }
      }
      
      return {
        ...prev,
        [name]: value
      }
    })
  }

  // Form validasyonu
  const isFormValid = () => {
    // Temel paket bilgileri gerekli
    const packageInfoValid = formData.packageType !== '' && dateRange[0].startDate <= dateRange[0].endDate
    
    // Eğer ödeme durumu "ödendi" ise ödeme yöntemi, tutar ve ödeme tarihi zorunludur
    const paymentDetailsValid = formData.paymentStatus === 'beklemede' || 
      (formData.paymentMethod !== '' && 
       formData.amount.trim() !== '' && 
       formData.paymentDate !== null)
    
    return packageInfoValid && paymentDetailsValid
  }

  // Uzatma işlemini gerçekleştir
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid()) return

    setIsLoading(true)
    try {
      const newStartDate = dateRange[0].startDate
      const newEndDate = dateRange[0].endDate
      const newPackageType = formData.packageType

      const finalPaymentMethod = formData.paymentStatus === 'beklemede' ? 'belirlenmedi' : formData.paymentMethod
      const finalPaymentAmount = formData.paymentStatus === 'beklemede' ? 0 : parseFloat(formData.amount)
      const finalPaymentDate = formData.paymentStatus === 'beklemede' ? null : formData.paymentDate
      const finalNotes = formData.note.trim() || null

      if (isEditMode && existingExtension) {
        // --- EDIT MODE ---
        // 1. extension_history UPDATE (previous_* alanlarına dokunma)
        const { error: historyError } = await supabase
          .from('extension_history')
          .update({
            new_start_date: newStartDate,
            new_end_date: newEndDate,
            new_package_type: newPackageType,
            payment_status: formData.paymentStatus,
            payment_method: finalPaymentMethod,
            payment_amount: finalPaymentAmount,
            payment_date: finalPaymentDate,
            notes: finalNotes
          })
          .eq('id', existingExtension.id)
        if (historyError) throw historyError

        // 2. registrations UPDATE (extension_count'a dokunma)
        const { error: updateError } = await supabase
          .from('registrations')
          .update({
            package_type: newPackageType,
            package_start_date: newStartDate,
            package_end_date: newEndDate,
            payment_status: formData.paymentStatus,
            payment_method: finalPaymentMethod,
            payment_amount: finalPaymentAmount,
            payment_date: finalPaymentDate,
            notes: finalNotes
          })
          .eq('id', registration.id)
        if (updateError) throw updateError

        // 3. financial_records UPDATE (FK ile; yoksa fuzzy fallback ile ilk match)
        const { data: finRow, error: finLookupError } = await supabase
          .from('financial_records')
          .select('id')
          .eq('extension_history_id', existingExtension.id)
          .maybeSingle()
        if (finLookupError) throw finLookupError

        if (finRow?.id) {
          const { error: finUpdateError } = await supabase
            .from('financial_records')
            .update({
              amount: finalPaymentAmount,
              payment_method: finalPaymentMethod,
              payment_status: formData.paymentStatus,
              payment_date: finalPaymentDate,
              notes: finalNotes
            })
            .eq('id', finRow.id)
          if (finUpdateError) throw finUpdateError
        } else {
          // Legacy kayıt: FK bağı yok, fuzzy match ile en yakın extension_payment'i güncelle
          const { data: candidates } = await supabase
            .from('financial_records')
            .select('id, amount, payment_method, payment_date, created_at')
            .eq('registration_id', registration.id)
            .eq('transaction_type', 'extension_payment')
            .is('extension_history_id', null)
            .order('created_at', { ascending: false })

          const match = (candidates || []).find(c =>
            Number(c.amount) === Number(existingExtension.payment_amount) &&
            c.payment_method === existingExtension.payment_method
          )
          if (match) {
            await supabase
              .from('financial_records')
              .update({
                amount: finalPaymentAmount,
                payment_method: finalPaymentMethod,
                payment_status: formData.paymentStatus,
                payment_date: finalPaymentDate,
                notes: finalNotes,
                extension_history_id: existingExtension.id
              })
              .eq('id', match.id)
          } else {
            console.warn('Financial record match not found for edit; skipping financial update')
          }
        }

        setToast({
          visible: true,
          message: language === 'tr' ? 'Uzatma başarıyla güncellendi' : 'Extension has been successfully updated',
          type: 'success'
        })
      } else {
        // --- CREATE MODE ---
        const previousEndDate = new Date(registration.package_end_date)

        // 1. Uzatma tarihini ve sayacını güncelle
        const { error: updateError } = await supabase
          .from('registrations')
          .update({
            package_type: newPackageType,
            package_start_date: newStartDate,
            package_end_date: newEndDate,
            payment_status: formData.paymentStatus,
            payment_method: finalPaymentMethod,
            payment_amount: finalPaymentAmount,
            extension_count: registration.extension_count + 1,
            last_extension_date: new Date(),
            payment_date: finalPaymentDate,
            notes: finalNotes
          })
          .eq('id', registration.id)
        if (updateError) throw updateError

        // 2. Uzatma geçmişine kaydet ve yeni id'yi al
        const { data: historyRow, error: historyError } = await supabase
          .from('extension_history')
          .insert({
            registration_id: registration.id,
            previous_end_date: previousEndDate,
            new_start_date: newStartDate,
            new_end_date: newEndDate,
            previous_package_type: registration.package_type,
            new_package_type: newPackageType,
            payment_status: formData.paymentStatus,
            payment_method: finalPaymentMethod,
            payment_amount: finalPaymentAmount,
            payment_date: finalPaymentDate,
            notes: finalNotes
          })
          .select('id')
          .single()
        if (historyError) throw historyError

        // 3. Finansal kayıt oluştur (FK ile bağlı)
        const { error: financialError } = await supabase
          .from('financial_records')
          .insert({
            registration_id: registration.id,
            extension_history_id: historyRow.id,
            transaction_type: 'extension_payment',
            amount: finalPaymentAmount,
            payment_method: finalPaymentMethod,
            payment_status: formData.paymentStatus,
            payment_date: finalPaymentDate,
            notes: finalNotes
          })
        if (financialError) throw financialError

        setToast({
          visible: true,
          message: language === 'tr' ? 'Paket başarıyla uzatıldı' : 'Package has been successfully extended',
          type: 'success'
        })
      }

      onClose()
      onSuccess?.()
    } catch (error) {
      console.error('Uzatma işlemi sırasında hata:', error.message)
      setToast({
        visible: true,
        message: isEditMode
          ? (language === 'tr' ? 'Uzatma güncellenirken bir hata oluştu' : 'An error occurred while updating the extension')
          : (language === 'tr' ? 'Uzatma işlemi sırasında bir hata oluştu' : 'An error occurred during the extension process'),
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <div className={`fixed inset-0 z-50 overflow-y-auto ${!isOpen ? 'hidden' : ''}`}>
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity"
        />

        {/* Modal */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <div 
            className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#121621] p-6 shadow-xl transition-all"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#0071e3]/10 dark:bg-[#0071e3]/20 rounded-full flex items-center justify-center shrink-0">
                <ArrowPathIcon className="w-6 h-6 text-[#0071e3]" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
                  {isEditMode
                    ? (language === 'tr' ? 'Uzatmayı Düzenle' : 'Edit Extension')
                    : (language === 'tr' ? 'Paketi Uzat' : 'Extend Package')}
                </h2>
                <p className="text-[#6e6e73] dark:text-[#86868b]">
                  {isEditMode
                    ? (language === 'tr'
                        ? `${registration?.student_name} için uzatma düzenleme`
                        : `Editing extension for ${registration?.student_name}`)
                    : (language === 'tr'
                        ? `${registration?.student_name} için paket uzatma işlemi`
                        : `Package extension for ${registration?.student_name}`)}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Grid Container */}
              <div className="grid md:grid-cols-2 grid-cols-1 gap-4 mb-8">
                {/* Sol Kolon */}
                <div className="space-y-4">
                  {/* Kayıt Tarihi */}
                  <div className="relative" ref={datePickerRef}>
                    <div className={iconWrapperClasses}>
                      <CalendarDaysIcon className={iconClasses} />
                    </div>
                    <input
                      type="text"
                      className={`${inputClasses} cursor-pointer peer`}
                      placeholder={language === 'tr' ? "Yeni Bitiş Tarihi Seçin" : "Select New End Date"}
                      value={`${formatDate(dateRange[0].startDate)} - ${formatDate(dateRange[0].endDate)}`}
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      readOnly
                      tabIndex={1}
                      autoComplete="off"
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-[#007AFF] text-white text-sm rounded-md opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg dark:shadow-[#007AFF]/20">
                      {language === 'tr' ? "Kayıt Başlangıç ve Kayıt Tarihi" : "Registration Start and End Date"}
                    </div>
                    {isCalendarOpen && (
                      <div className="absolute z-50 mt-2">
                        <div className="p-4 bg-white dark:bg-[#121621] rounded-xl shadow-xl border border-[#d2d2d7] dark:border-[#424245]">
                          <style jsx="true">
                          {`
                            .rdrCalendarWrapper,
                            .rdrDateDisplayWrapper,
                            .rdrMonthAndYearWrapper {
                              background-color: transparent !important;
                              color: inherit !important;
                            }
                            .dark .rdrCalendarWrapper,
                            .dark .rdrDateDisplayWrapper,
                            .dark .rdrMonthAndYearWrapper {
                              background-color: #121621 !important;
                              color: white !important;
                            }
                            .dark .rdrMonthAndYearPickers select {
                              color: white !important;
                              background-color: #121621 !important;
                            }
                            .dark .rdrMonthAndYearPickers select option {
                              background-color: #121621 !important;
                            }
                            .dark .rdrDateDisplayItem {
                              background-color: #121621 !important;
                              border-color: #424245 !important;
                            }
                            .dark .rdrDateDisplayItem input {
                              color: white !important;
                            }
                            .dark .rdrDayNumber span {
                              color: white !important;
                            }
                            .dark .rdrDayPassive .rdrDayNumber span {
                              color: #636363 !important;
                            }
                            .dark .rdrMonthName {
                              color: #86868b !important;
                            }
                            .dark .rdrWeekDay {
                              color: #86868b !important;
                            }
                            .dark .rdrDay {
                              background-color: transparent !important;
                            }
                            .dark .rdrDayDisabled {
                              background-color: #121621 !important;
                            }
                            .dark .rdrDayDisabled span {
                              color: #636363 !important;
                            }
                            .dark .rdrDayToday {
                              background-color: transparent !important;
                            }
                            .dark .rdrDayToday .rdrDayNumber span:after {
                              background: #007AFF !important;
                            }
                            .dark .rdrDayHovered {
                              background-color: #2a3241 !important;
                            }
                            .dark .rdrDayStartPreview, 
                            .dark .rdrDayInPreview, 
                            .dark .rdrDayEndPreview {
                              background-color: rgba(0, 122, 255, 0.1) !important;
                            }
                            .dark .rdrStartEdge,
                            .dark .rdrEndEdge {
                              background-color: #007AFF !important;
                            }
                            .dark .rdrDayStartPreview, 
                            .dark .rdrDayEndPreview {
                              border-color: #007AFF !important;
                            }
                            .dark .rdrInRange {
                              background-color: rgba(0, 122, 255, 0.2) !important;
                            }
                            .rdrDateDisplayItem {
                              position: relative;
                            }
                            .rdrDateDisplayItem::after {
                              content: attr(data-tooltip);
                              position: absolute;
                              top: -25px;
                              left: 50%;
                              transform: translateX(-50%);
                              background-color: #333;
                              color: white;
                              padding: 4px 8px;
                              border-radius: 4px;
                              font-size: 12px;
                              white-space: nowrap;
                              z-index: 1000;
                              opacity: 0;
                              visibility: hidden;
                              transition: opacity 0.2s, visibility 0.2s;
                            }
                            .rdrDateDisplayItem:hover::after {
                              opacity: 1;
                              visibility: visible;
                            }
                            .dark .rdrDateDisplayItem::after {
                              background-color: #4a4a4a;
                            }
                            .rdrDateDisplayItem:first-child::after {
                              content: "Başlangıç Tarihi";
                            }
                            .rdrDateDisplayItem:last-child::after {
                              content: "Bitiş Tarihi";
                            }
                          `}
                          </style>
                          <DateRange
                            onChange={item => {
                              setDateRange([item.selection])
                              if (item.selection.endDate > item.selection.startDate) {
                                setIsCalendarOpen(false)
                              }
                            }}
                            moveRangeOnFirstSelection={false}
                            months={1}
                            ranges={dateRange}
                            direction="horizontal"
                            locale={tr}
                            rangeColors={['#007AFF']}
                            minDate={new Date(isEditMode && existingExtension ? existingExtension.previous_end_date : registration?.package_end_date)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Paket Türü */}
                  <div className="relative">
                    <div className={iconWrapperClasses}>
                      <CubeIcon className={iconClasses} />
                    </div>
                    <select 
                      name="packageType"
                      value={formData.packageType}
                      onChange={handleInputChange}
                      className={`${inputClasses} ${!formData.packageType && 'text-[#86868b]'}`}
                      tabIndex={2}
                      autoComplete="off"
                    >
                      <option value="" disabled className="text-[#86868b] dark:text-[#86868b] bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Paket Türü Seçin" : "Select Package Type"}
                      </option>
                      <option value="tek-seferlik" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Tek Seferlik Katılım" : "One Time Participation"}
                      </option>
                      <option value="hafta-1" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Haftada 1 Gün" : "1 Day Per Week"}
                      </option>
                      <option value="hafta-2" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Haftada 2 Gün" : "2 Days Per Week"}
                      </option>
                      <option value="hafta-3" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Haftada 3 Gün" : "3 Days Per Week"}
                      </option>
                      <option value="hafta-4" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Haftada 4 Gün" : "4 Days Per Week"}
                      </option>
                    </select>
                  </div>

                  {/* Ödeme Durumu */}
                  <div className="relative">
                    <div className={iconWrapperClasses}>
                      <CreditCardIcon className={iconClasses} />
                    </div>
                    <select 
                      name="paymentStatus"
                      value={formData.paymentStatus}
                      onChange={handleInputChange}
                      className={`${inputClasses} ${!formData.paymentStatus && 'text-[#86868b]'}`}
                      tabIndex={3}
                      autoComplete="off"
                    >
                      <option value="" disabled className="text-[#86868b] dark:text-[#86868b] bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Ödeme Durumu Seçin" : "Select Payment Status"}
                      </option>
                      <option value="odendi" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Ödendi" : "Paid"}
                      </option>
                      <option value="beklemede" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Beklemede" : "Pending"}
                      </option>
                    </select>
                  </div>
                </div>

                {/* Sağ Kolon */}
                <div className="space-y-4">
                  {/* Ödeme Yeri */}
                  <div className="relative group">
                    <div className={iconWrapperClasses}>
                      <BanknotesIcon className={iconClasses} />
                    </div>
                    <select 
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      className={`${inputClasses} ${!formData.paymentMethod && 'text-[#86868b]'} ${formData.paymentStatus !== 'odendi' && 'opacity-50 cursor-not-allowed'}`}
                      tabIndex={4}
                      autoComplete="off"
                      disabled={formData.paymentStatus !== 'odendi'}
                    >
                      <option value="" disabled className="text-[#86868b] dark:text-[#86868b] bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Ödeme Yeri Seçin" : "Select Payment Method"}
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
                    {formData.paymentStatus !== 'odendi' && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-[#007AFF] text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg dark:shadow-[#007AFF]/20">
                        {language === 'tr' 
                          ? 'Ödeme durumu "Ödendi" seçildiğinde aktif olacaktır'
                          : 'Will be active when payment status is set to "Paid"'
                        }
                      </div>
                    )}
                  </div>

                  {/* Ödenen Tutar */}
                  <div className="relative group">
                    <div className={iconWrapperClasses}>
                      <CurrencyDollarIcon className={iconClasses} />
                    </div>
                    <input
                      type="text"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className={`${inputClasses} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${formData.paymentStatus !== 'odendi' && 'opacity-50 cursor-not-allowed'}`}
                      placeholder={language === 'tr' ? "0.00 ₺" : "0.00 ₺"}
                      tabIndex={5}
                      autoComplete="off"
                      disabled={formData.paymentStatus !== 'odendi'}
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
                    {formData.paymentStatus !== 'odendi' && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-[#007AFF] text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg dark:shadow-[#007AFF]/20">
                        {language === 'tr' 
                          ? 'Ödeme durumu "Ödendi" seçildiğinde aktif olacaktır'
                          : 'Will be active when payment status is set to "Paid"'
                        }
                      </div>
                    )}
                  </div>

                  {/* Ödeme Tarihi - Taşındı */}
                  <div className="relative group" ref={paymentDatePickerRef}>
                    <div className={iconWrapperClasses}>
                      <CalendarDaysIcon className={iconClasses} />
                    </div>
                    <input
                      type="text"
                      className={`${inputClasses} cursor-pointer peer ${formData.paymentStatus !== 'odendi' && 'opacity-50 cursor-not-allowed'}`}
                      placeholder={language === 'tr' ? "Ödeme Yapılan Gün" : "Payment Date"}
                      value={formData.paymentDate 
                        ? formatDate(formData.paymentDate) 
                        : formData.paymentStatus === 'beklemede' 
                          ? (language === 'tr' ? "Ödeme Beklemede" : "Payment Pending")
                          : (language === 'tr' ? "Ödeme Tarihi Seçin" : "Select Payment Date")}
                      onClick={() => formData.paymentStatus === 'odendi' && setIsPaymentDatePickerOpen(!isPaymentDatePickerOpen)}
                      readOnly
                      tabIndex={6}
                      autoComplete="off"
                      disabled={formData.paymentStatus !== 'odendi'}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-[#007AFF] text-white text-sm rounded-md opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg dark:shadow-[#007AFF]/20">
                      {formData.paymentStatus === 'odendi' 
                        ? (language === 'tr' ? "Ödeme Tarihi" : "Payment Date")
                        : (language === 'tr' ? "Ödeme durumu 'Ödendi' olduğunda aktif olacaktır" : "Will be active when payment status is 'Paid'")
                      }
                    </div>
                    {isPaymentDatePickerOpen && (
                      <div className="absolute bottom-full left-0 mb-2 z-50">
                        <div className="p-4 bg-white dark:bg-[#121621] rounded-xl shadow-xl border border-[#d2d2d7] dark:border-[#424245]">
                          <style jsx="true">
                            {`
                              .rdrCalendarWrapper,
                              .rdrDateDisplayWrapper,
                              .rdrMonthAndYearWrapper {
                                background-color: transparent !important;
                                color: inherit !important;
                              }
                              .dark .rdrCalendarWrapper,
                              .dark .rdrDateDisplayWrapper,
                              .dark .rdrMonthAndYearWrapper {
                                background-color: #121621 !important;
                                color: white !important;
                              }
                              .dark .rdrMonthAndYearPickers select {
                                color: white !important;
                                background-color: #121621 !important;
                              }
                              .dark .rdrMonthAndYearPickers select option {
                                background-color: #121621 !important;
                              }
                              .dark .rdrDateDisplayItem {
                                background-color: #121621 !important;
                                border-color: #424245 !important;
                              }
                              .dark .rdrDateDisplayItem input {
                                color: white !important;
                              }
                              .dark .rdrDayNumber span {
                                color: white !important;
                              }
                              .dark .rdrDayPassive .rdrDayNumber span {
                                color: #636363 !important;
                              }
                              .dark .rdrMonthName {
                                color: #86868b !important;
                              }
                              .dark .rdrWeekDay {
                                color: #86868b !important;
                              }
                            `}
                          </style>
                          <DateRange
                            onChange={item => {
                              setFormData(prev => ({
                                ...prev,
                                paymentDate: item.selection.startDate
                              }))
                              setIsPaymentDatePickerOpen(false)
                            }}
                            moveRangeOnFirstSelection={false}
                            months={1}
                            ranges={[{
                              startDate: formData.paymentDate || new Date(),
                              endDate: formData.paymentDate || new Date(),
                              key: 'selection'
                            }]}
                            direction="horizontal"
                            locale={tr}
                            rangeColors={['#007AFF']}
                            showDateDisplay={false}
                            staticRanges={[]}
                            inputRanges={[]}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notlar - Full genişlikte */}
                <div className="md:col-span-2 relative">
                  <div className={iconWrapperClasses}>
                    <PencilSquareIcon className={iconClasses} />
                  </div>
                  <input
                    type="text"
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Not ekle..." : "Add note..."}
                    tabIndex={7}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-11 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#161616] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-[#2a2a2a] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                  tabIndex={8}
                  disabled={isLoading}
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-full h-11 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  tabIndex={9}
                  disabled={!isFormValid() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>
                        {isEditMode
                          ? (language === 'tr' ? 'Kaydediliyor' : 'Saving')
                          : (language === 'tr' ? 'Uzatılıyor' : 'Extending')}
                      </span>
                    </>
                  ) : (
                    isEditMode
                      ? (language === 'tr' ? 'Kaydet' : 'Save')
                      : (language === 'tr' ? 'Uzat' : 'Extend')
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