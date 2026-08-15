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
  FaceSmileIcon,
  UsersIcon,
  PhoneIcon,
  CakeIcon,
  CubeIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

// Supabase istemcisini oluştur
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function UpdateModal({ isOpen, onClose, onSuccess, registration }) {
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

  // Form verilerini mevcut kayıt verileriyle başlat
  const [formData, setFormData] = useState({
    studentName: '',
    parentName: '',
    phone: '',
    age: '',
    packageType: '',
    paymentStatus: '',
    paymentMethod: '',
    amount: '',
    note: '',
    paymentDate: null // Varsayılan olarak null
  })

  // Tarih aralığını mevcut kayıt verileriyle başlat
  const [dateRange, setDateRange] = useState([{
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  }])

  // Kayıt verileri geldiğinde form verilerini güncelle
  useEffect(() => {
    if (registration) {
      setFormData({
        studentName: registration.student_name || '',
        parentName: registration.parent_name || '',
        phone: registration.parent_phone || '',
        age: registration.student_age || '',
        packageType: registration.package_type || '',
        paymentStatus: registration.payment_status || '',
        paymentMethod: registration.payment_method || '',
        amount: registration.payment_amount?.toString() || '',
        note: registration.notes || '',
        paymentDate: registration.payment_date ? new Date(registration.payment_date) : null
      })

      setDateRange([{
        startDate: new Date(registration.package_start_date),
        endDate: new Date(registration.package_end_date),
        key: 'selection'
      }])
    }
  }, [registration])

  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!isOpen) {
      setIsCalendarOpen(false)
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

  // Ücretsiz katılım: ödeme ve paket tarihi sorulmaz
  const isFree = formData.packageType === 'ucretsiz'

  const isFormValid = () => {
    const hasIdentityFields = (
      formData.studentName.trim() !== '' &&
      formData.parentName.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.age.trim() !== '' &&
      formData.packageType !== ''
    )

    // Ücretsiz katılımda ödeme alanları ve tarih aralığı istenmez
    if (isFree) {
      return hasIdentityFields
    }

    // Temel validasyon (her durumda kontrol edilecek alanlar)
    const baseValidation = (
      hasIdentityFields &&
      formData.paymentStatus !== '' &&
      dateRange[0].startDate !== dateRange[0].endDate
    )

    // Eğer ödeme durumu "beklemede" ise ödeme detaylarını kontrol etme
    if (formData.paymentStatus === 'beklemede') {
      return baseValidation
    }

    // Eğer ödeme durumu "odendi" ise ödeme detaylarını da kontrol et
    return (
      baseValidation &&
      formData.paymentMethod !== '' &&
      formData.amount.trim() !== '' &&
      formData.paymentDate !== null // Ödeme tarihi seçilmiş olmalı
    )
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      // Ücretsiz katılım: ödeme alanları boşaltılır ve pasifleşir
      // ('belirlenmedi'/0 dönüşümü kaydetme anında yapılır)
      if (name === 'packageType' && value === 'ucretsiz') {
        return {
          ...prev,
          [name]: value,
          paymentStatus: 'ucretsiz',
          paymentMethod: '',
          amount: '',
          paymentDate: null
        }
      }

      // Ücretsizden ücretli pakete dönülürse ödeme alanları sıfırlanır
      if (name === 'packageType' && prev.packageType === 'ucretsiz' && value !== 'ucretsiz') {
        return {
          ...prev,
          [name]: value,
          paymentStatus: '',
          paymentMethod: '',
          amount: '',
          paymentDate: null
        }
      }

      // Eğer ödeme durumu "beklemede" olarak değiştirilirse, ödeme yeri ve tutarını temizle
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
      // Bu kullanıcıyı açıkça bir ödeme yöntemi seçmeye zorlar
      if (name === 'paymentStatus' && value === 'odendi') {
        return {
          ...prev,
          [name]: value,
          paymentMethod: '', // Dropdown'ı sıfırla, kullanıcıyı seçim yapmaya zorla
          paymentDate: null  // Otomatik bugün atamayı kaldırdık
        }
      }
      
      return {
        ...prev,
        [name]: value
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid()) return

    setIsLoading(true)
    try {
      // Ücretsiz katılım / beklemede durumunda varsayılan değerler ata
      const noPaymentDetails = isFree || formData.paymentStatus === 'beklemede'
      const paymentMethod = noPaymentDetails ? 'belirlenmedi' : formData.paymentMethod
      const paymentAmount = noPaymentDetails ? 0 : (parseFloat(formData.amount) || 0)
      const paymentDate = noPaymentDetails ? null : formData.paymentDate

      // Güncellenecek ana kayıt verileri
      const updateData = {
        student_name: formData.studentName.trim(),
        student_age: formData.age.trim(),
        parent_name: formData.parentName.trim(),
        parent_phone: formData.phone.trim(),
        package_type: formData.packageType,
        package_start_date: dateRange[0].startDate,
        package_end_date: dateRange[0].endDate,
        payment_status: formData.paymentStatus,
        payment_method: paymentMethod,
        payment_amount: paymentAmount,
        payment_date: paymentDate, // Ödeme beklemede/ücretsiz ise null
        notes: formData.note.trim() || null
      }

      // Eğer ilk kayıt güncelleniyorsa (uzatma yoksa), initial_* alanlarını da ekle
      if (registration.extension_count === 0) {
        updateData.initial_package_type = formData.packageType // Gerekirse ilk paket tipi de güncellenebilir
        updateData.initial_start_date = dateRange[0].startDate
        updateData.initial_end_date = dateRange[0].endDate
        updateData.initial_payment_method = paymentMethod
        updateData.initial_payment_amount = paymentAmount
        updateData.initial_notes = formData.note.trim() || null
        // Not: initial_payment_date gibi bir alanınız yok, payment_date kullanılıyor
      }

      // 1. Ana kaydı güncelle (initial_* alanları dahil veya hariç)
      const { data: updatedRegistrationData, error: updateRegError } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('id', registration.id)
        .select() // Select the updated data to potentially get the latest financial record id if needed
        .single(); // Assuming update returns the updated row

      if (updateRegError) {
        if (updateRegError.code === '23505' && updateRegError.details?.includes('parent_phone')) {
          throw new Error(language === 'tr' 
            ? 'Bu telefon numarası ile daha önce kayıt yapılmış!'
            : 'This phone number has already been registered!'
          )
        }
        throw updateRegError
      }

      // 2. İster ilk kayıt ister uzatma olsun, ilgili finansal kaydı güncelle.
      // Ücretsiz katılımda finansal kayda HİÇ dokunulmaz: geçmişte tahsil edilen para
      // gerçek gelirdir, sıfırlanmamalı (ayrıca 'ucretsiz' statüsü DB kısıtını ihlal eder).
      const { data: latestFinancialRecord, error: findLatestError } = isFree
        ? { data: null, error: null }
        : await supabase
            .from('financial_records')
            .select('id')
            .eq('registration_id', registration.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

      if (findLatestError) {
        // Hata varsa ama 'PGRST116' (No rows found) değilse logla, ama devam et.
        if (findLatestError.code !== 'PGRST116') {
          console.error("En son finansal kayıt bulunurken hata:", findLatestError);
        } else {
          // Finansal kayıt yok (ücretsizden ücretliye dönüşüm) → yeni kayıt oluştur,
          // aksi halde bu gelir hiçbir yere yazılmazdı.
          const { error: insertFinancialError } = await supabase
            .from('financial_records')
            .insert({
              registration_id: registration.id,
              transaction_type: 'initial_payment',
              amount: paymentAmount,
              payment_method: paymentMethod,
              payment_status: formData.paymentStatus,
              payment_date: paymentDate,
              notes: formData.note.trim() || null
            });

          if (insertFinancialError) {
            console.error("Finansal kayıt oluşturulurken hata:", insertFinancialError);
            setToast({
              visible: true,
              message: language === 'tr' ? 'Finansal detaylar kaydedilirken hata oluştu.' : 'Error saving financial details.',
              type: 'error'
            });
          }
        }
      } else if (latestFinancialRecord) {
        // En son finansal kayıt bulunduysa, onu güncelle
        const { error: updateFinancialError } = await supabase
          .from('financial_records')
          .update({
            amount: paymentAmount,
            payment_method: paymentMethod,
            payment_status: formData.paymentStatus,
            payment_date: paymentDate,
            notes: formData.note.trim() || null
            // transaction_type DOKUNULMUYOR!
          })
          .eq('id', latestFinancialRecord.id); // Bulunan ID ile güncelle

        if (updateFinancialError) {
          console.error("İlgili finansal kayıt güncellenirken hata:", updateFinancialError);
          // Hata olursa işlemi geri almak zor olabilir, loglamak iyi bir başlangıç.
          // Kullanıcıya kesinlikle bir hata mesajı gösterilmeli.
          setToast({
            visible: true,
            message: language === 'tr' ? 'Finansal detaylar güncellenirken hata oluştu.' : 'Error updating financial details.',
            type: 'error'
          });
          // Belki burada işlemi durdurmak/geri almak daha iyi olabilir ama şimdilik logla ve devam et.
        }
      }

      setToast({
        visible: true,
        message: language === 'tr' ? 'Kayıt başarıyla güncellendi.' : 'Record has been successfully updated.',
        type: 'success'
      })
      onClose()
      onSuccess?.()
    } catch (error) {
      console.error('Kayıt güncellenirken hata:', error.message)
      setToast({
        visible: true,
        message: error.message === 'Bu telefon numarası ile daha önce kayıt yapılmış!' || error.message === 'This phone number has already been registered!'
          ? error.message 
          : language === 'tr' ? 'Kayıt güncelleme sırasında hata oluştu' : 'An error occurred while updating the record',
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
                {language === 'tr' ? 'Kayıt Güncelle' : 'Update Record'}
              </h2>
              <p className="mt-1 text-[#6e6e73] dark:text-[#86868b]">
                {language === 'tr' 
                  ? 'Lütfen güncellemek istediğiniz bilgileri düzenleyin'
                  : 'Please edit the information you want to update'
                }
              </p>
            </div>

            {/* Form */}
            <form 
              className="grid md:grid-cols-2 grid-cols-1 gap-x-6 gap-y-4"
              onSubmit={handleSubmit}
            >
              {/* Sol Kolon */}
              <div className="space-y-4">
                {/* Öğrenci İsmi */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <FaceSmileIcon className={iconClasses} />
                  </div>
                  <input
                    type="text"
                    name="studentName"
                    value={formData.studentName}
                    onChange={(e) => {
                      const words = e.target.value.split(' ')
                      const capitalizedWords = words.map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      )
                      setFormData(prev => ({
                        ...prev,
                        studentName: capitalizedWords.join(' ')
                      }))
                    }}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Öğrenci İsmi" : "Student Name"}
                    tabIndex={1}
                    autoComplete="off"
                  />
                </div>

                {/* Ebeveyn İsmi */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <UsersIcon className={iconClasses} />
                  </div>
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={(e) => {
                      const words = e.target.value.split(' ')
                      const capitalizedWords = words.map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      )
                      setFormData(prev => ({
                        ...prev,
                        parentName: capitalizedWords.join(' ')
                      }))
                    }}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Ebeveyn İsmi" : "Parent Name"}
                    tabIndex={2}
                    autoComplete="off"
                  />
                </div>

                {/* Telefon */}
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <PhoneIcon className={iconClasses} />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setFormData(prev => ({
                        ...prev,
                        phone: value
                      }))
                    }}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Telefon Numarası" : "Phone Number"}
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
                    name="age"
                    value={formData.age}
                    onChange={(e) => {
                      const words = e.target.value.split(' ')
                      const capitalizedWords = words.map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      setFormData(prev => ({
                        ...prev,
                        age: capitalizedWords.join(' ')
                      }))
                    }}
                    className={inputClasses}
                    placeholder={language === 'tr' ? "Yaş/Aylık - Örn:24 Aylık / 2 Yaş" : "Age/Months - Ex:24 Months / 2 Years"}
                    tabIndex={4}
                    autoComplete="off"
                  />
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
                    tabIndex={5}
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
                    <option value="ucretsiz" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                      {language === 'tr' ? "Ücretsiz Katılım" : "Free Participation"}
                    </option>
                  </select>
                </div>
              </div>

              {/* Sağ Kolon */}
              <div className="space-y-4">
                {/* Kayıt Tarihi */}
                <div className="relative" ref={datePickerRef}>
                  <div className={iconWrapperClasses}>
                    <CalendarDaysIcon className={iconClasses} />
                  </div>
                  <input
                    type="text"
                    className={`${inputClasses} ${isFree ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer peer'}`}
                    placeholder={language === 'tr' ? "Kayıt Tarihi Seçin" : "Select Registration Date"}
                    value={isFree
                      ? (language === 'tr' ? "Süresiz" : "Unlimited")
                      : `${formatDate(dateRange[0].startDate)} - ${formatDate(dateRange[0].endDate)}`}
                    onClick={() => { if (!isFree) setIsCalendarOpen(!isCalendarOpen) }}
                    readOnly
                    disabled={isFree}
                    tabIndex={6}
                    autoComplete="off"
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-[#007AFF] text-white text-sm rounded-md opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg dark:shadow-[#007AFF]/20">
                    {language === 'tr' ? "Kayıt Başlangıç ve Bitiş Tarihi" : "Registration Start and End Date"}
                  </div>
                  {isCalendarOpen && (
                    <div className="absolute z-50 mt-2">
                      <div className="p-4 bg-white dark:bg-[#1d1f2e] rounded-xl shadow-xl border border-[#d2d2d7] dark:border-[#424245]">
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
                            // Eğer bitiş tarihi seçildiyse ve başlangıç tarihinden farklıysa takvimi kapat
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
                        />
                      </div>
                    </div>
                  )}
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
                    className={`${inputClasses} ${!formData.paymentStatus && 'text-[#86868b]'} ${isFree && 'opacity-50 cursor-not-allowed'}`}
                    tabIndex={7}
                    autoComplete="off"
                    disabled={isFree}
                  >
                    <option value="" disabled className="text-[#86868b] dark:text-[#86868b] bg-white dark:bg-[#1d1d1f]">
                      {language === 'tr' ? "Ödeme Durumu Seçin" : "Select Payment Status"}
                    </option>
                    {/* Yalnızca ücretsiz katılımda görünür (select pasif olduğu için seçilemez) */}
                    {isFree && (
                      <option value="ucretsiz" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                        {language === 'tr' ? "Ücretsiz" : "Free"}
                      </option>
                    )}
                    <option value="odendi" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                      {language === 'tr' ? "Ödendi" : "Paid"}
                    </option>
                    <option value="beklemede" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1d1d1f]">
                      {language === 'tr' ? "Beklemede" : "Pending"}
                    </option>
                  </select>
                </div>

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
                    tabIndex={8}
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
                    tabIndex={9}
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
                      : isFree
                        ? (language === 'tr' ? "Ödeme Alınmıyor" : "No Payment")
                        : formData.paymentStatus === 'beklemede'
                          ? (language === 'tr' ? "Ödeme Beklemede" : "Payment Pending")
                          : (language === 'tr' ? "Ödeme Tarihi Seçin" : "Select Payment Date")}
                    onClick={() => formData.paymentStatus === 'odendi' && setIsPaymentDatePickerOpen(!isPaymentDatePickerOpen)}
                    readOnly
                    tabIndex={10}
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
                        <style>
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

              {/* Notlar - Şimdi full genişlikte */}
              <div className="md:col-span-2 relative">
                <div className={iconWrapperClasses}>
                  <PencilSquareIcon className={iconClasses} />
                </div>
                <input
                  type="text"
                  name="note"
                  value={formData.note}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      note: value.charAt(0).toUpperCase() + value.slice(1)
                    }))
                  }}
                  className={inputClasses}
                  placeholder={language === 'tr' ? "Not ekle..." : "Add note..."}
                  tabIndex={11}
                  autoComplete="off"
                />
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-11 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#161616] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-[#2a2a2a] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                  tabIndex={12}
                  disabled={isLoading}
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-full h-11 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  tabIndex={13}
                  disabled={!isFormValid() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{language === 'tr' ? 'Güncelleniyor' : 'Updating'}</span>
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