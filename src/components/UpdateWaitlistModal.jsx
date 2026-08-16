import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
import { toDateOnly } from '../lib/dates'
import { LESSON_COUNT_OPTIONS, DEFAULT_LESSON_COUNT, formatLessonCount } from '../lib/lessonCounts'
import DatePicker, { registerLocale } from 'react-datepicker'
import { uk } from 'date-fns/locale'
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
registerLocale('uk', uk)

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function UpdateWaitlistModal({ isOpen, onClose, onSuccess, entry }) {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    parent_name: '',
    parent_phone: '',
    student_name: '',
    student_age: '',
    lesson_count: DEFAULT_LESSON_COUNT,
    contact_date: new Date(),
    status: '',
    notes: ''
  })

  // Form validasyonu için state
  const [isFormValid, setIsFormValid] = useState(false)

  // Entry değiştiğinde form verilerini güncelle
  useEffect(() => {
    if (entry) {
      setFormData({
        ...entry,
        contact_date: new Date(entry.contact_date)
      })
    }
  }, [entry])

  // Form validasyonunu kontrol et
  useEffect(() => {
    const isValid = 
      formData.parent_name.trim() !== '' &&
      formData.parent_phone.trim() !== '' &&
      formData.student_name.trim() !== '' &&
      formData.student_age.trim() !== '' &&
      Number(formData.lesson_count) > 0 &&
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
      // Alanlar tek tek yazılıyor. Eskiden satırın tamamı (...formData)
      // geri yazılıyordu; formun hiç göstermediği kolonlar da her
      // güncellemede yeniden yazıldığı için şema değişiklikleri
      // buradan sessizce geçiyordu.
      const { error } = await supabase
        .from('waitlist')
        .update({
          parent_name: formData.parent_name,
          parent_phone: formData.parent_phone,
          student_name: formData.student_name,
          student_age: formData.student_age,
          lesson_count: Number(formData.lesson_count),
          contact_date: toDateOnly(formData.contact_date),
          status: formData.status,
          notes: formData.notes
        })
        .eq('id', entry.id)

      if (error) throw error

      const successMessage = language === 'uk' 
        ? 'Запис успішно оновлено.' 
        : 'Record updated successfully.'

      onSuccess?.(successMessage, 'success')
      onClose()
    } catch (error) {
      console.error('Kayıt güncellenirken hata:', error.message)
      const errorMessage = language === 'uk'
        ? 'Помилка при оновленні запису.'
        : 'An error occurred while updating the record.'
      onSuccess?.(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClasses = "w-full h-[46px] pl-11 pr-4 rounded-xl border border-[#e5e5e5] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm"
  const iconClasses = "w-5 h-5 text-[#86868b]"
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
        placeholder={language === 'uk' ? "Оберіть дату" : "Select Date"}
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
                {language === 'uk' ? 'Оновити запис' : 'Update Record'}
              </h2>
              <p className="mt-1 text-[#6e6e73] dark:text-[#86868b]">
                {language === 'uk' ? 'Відредагуйте потрібні дані' : 'Please edit the information you want to update'}
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
                    placeholder={language === 'uk' ? "Імʼя батьків" : "Parent Name"}
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
                    placeholder={language === 'uk' ? "Номер телефону" : "Phone Number"}
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
                    placeholder={language === 'uk' ? "Імʼя дитини" : "Student Name"}
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
                    placeholder={language === 'uk' ? "Вік — напр.: 24 міс. / 2 роки" : "Age/Months - Ex:24 Months / 2 Years"}
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
                  {/* Ders sayısı — seçenekler lib/lessonCounts.js'te */}
                  <select
                    required
                    value={formData.lesson_count}
                    onChange={(e) => setFormData(prev => ({ ...prev, lesson_count: Number(e.target.value) }))}
                    className={inputClasses}
                    tabIndex={5}
                    autoComplete="off"
                  >
                    {LESSON_COUNT_OPTIONS.map(count => (
                      <option key={count} value={count} className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                        {formatLessonCount(count, language)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aranılan Tarih. Üst sınır BUGÜN: eskiden sabit
                    '2025-12-31' yazıyordu, o tarih geçtiği için takvimdeki
                    bütün günler pasifti — tıklamalar sessizce yok sayılıyordu. */}
                <DatePicker
                  portalId="root"
                  selected={formData.contact_date}
                  onChange={(date) => setFormData(prev => ({ ...prev, contact_date: date }))}
                  dateFormat="dd.MM.yyyy"
                  locale={language === 'uk' ? 'uk' : 'en'}
                  customInput={<CustomInput />}
                  maxDate={new Date()}
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
                      {language === 'uk' ? "Статус" : "Status"}
                    </option>
                    <option value="beklemede" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'uk' ? "Очікує" : "Waiting"}
                    </option>
                    <option value="iletisime-gecildi" className="text-[#1d1d1f] dark:text-white bg-white dark:bg-[#121621]">
                      {language === 'uk' ? "Звʼязалися" : "Contacted"}
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
                    placeholder={language === 'uk' ? "Додати нотатку..." : "Add note..."}
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
                  {language === 'uk' ? 'Скасувати' : 'Cancel'}
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
                      <span>{language === 'uk' ? 'Оновлення' : 'Updating'}</span>
                    </>
                  ) : (
                    language === 'uk' ? 'Оновити' : 'Update'
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