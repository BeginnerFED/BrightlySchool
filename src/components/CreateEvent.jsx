import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useTeachers } from '../hooks/useTeachers'
import { GRADE_OPTIONS } from '../lib/ageGroups'
import { CAPACITY_OPTIONS, DEFAULT_CAPACITY, formatCapacity } from '../lib/capacity'
import { supabase } from '../lib/supabase'
import { 
  XMarkIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  UsersIcon,
  ChartBarIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import DatePicker, { registerLocale } from 'react-datepicker'
import { uk } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import Select from 'react-select'

// Türkçe lokalizasyonu kaydet
registerLocale('uk', uk)

export default function CreateEvent({ isOpen, onClose, onSuccess, selectedDate, selectedTime }) {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState([])
  const [formData, setFormData] = useState({
    date: selectedDate ? new Date(selectedDate) : new Date(),
    time: {
      hour: selectedTime?.hour || '',
      minute: selectedTime?.minute || ''
    },
    ageGroup: '',
    teacherId: '',
    maxCapacity: DEFAULT_CAPACITY,
    topic: '',
    students: []
  })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const dropdownRef = useRef(null)

  // Dersi verecek kişi burada seçiliyor: öğretmen ataması artık öğrencide
  // değil, DERSTE. Liste sahibi de içeriyor (Yulia da ders veriyor).
  const { teachers } = useTeachers(isOpen)

  // Öğretmen alanı boş açılmasın; ilk sıradaki (sahip) varsayılan olsun.
  // useTeachers'tan SONRA gelmeli: bağımlılık dizisi render sırasında
  // değerlendiriliyor, önce yazılırsa teachers henüz tanımlı olmuyor.
  useEffect(() => {
    if (!isOpen || formData.teacherId || teachers.length === 0) return
    setFormData(prev => ({ ...prev, teacherId: teachers[0].id }))
  }, [isOpen, teachers, formData.teacherId])

  // Saat ve dakika seçenekleri
  // 09-22 arasi 14 saat: 7 sutunlu izgarada tam iki satir.
  // Takvim 09:00-23:00 gosteriyor ki 22:00'de baslayan ders de gorunsun
  // (bkz. Calendar.jsx slotMinTime/slotMaxTime).
  const hours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22']
  const minutes = ['00', '15', '30', '45']

  // Aktif öğrencileri getir
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // my_students görünümü: sahip herkesi, öğretmen yalnızca KENDİ
        // derslerine katılan öğrencileri görür. Ödeme bilgisi burada yok.
        const { data, error } = await supabase
          .from('my_students')
          .select('id, student_name, student_age, parent_name')
          .eq('is_active', true)
          .order('student_name')

        if (error) throw error

        const formattedStudents = data.map(student => ({
          value: student.id,
          label: student.student_name,
          parent: student.parent_name,
          age: student.student_age
        }))

        setStudents(formattedStudents)
      } catch (error) {
        console.error('Öğrenciler getirilirken hata:', error.message)
      }
    }

    if (isOpen) {
      fetchStudents()
    }
  }, [isOpen])

  // Dropdown dışına tıklandığında kapanması için
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Öğrenci seçme/kaldırma işlemi
  const toggleStudent = (student) => {
    const isSelected = selectedStudents.some(s => s.value === student.value)
    if (isSelected) {
      setSelectedStudents(selectedStudents.filter(s => s.value !== student.value))
    } else {
      setSelectedStudents([...selectedStudents, student])
    }
    setFormData(prev => ({ ...prev, students: isSelected ? 
      selectedStudents.filter(s => s.value !== student.value) : 
      [...selectedStudents, student] 
    }))
  }

  // Arama filtrelemesi ve sıralama
  // parent öğretmende null gelir (görünümde maskeli) — korumasız
  // toLowerCase() ilk tuşa basıldığında çökerdi
  const filteredStudents = students.filter(student =>
    student.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.parent || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Seçili öğrencileri üste taşı
    const aSelected = selectedStudents.some(s => s.value === a.value)
    const bSelected = selectedStudents.some(s => s.value === b.value)
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1
    // Seçili değillerse alfabetik sırala
    return a.label.localeCompare(b.label)
  })

  // Custom Dropdown Component
  const CustomDropdown = () => (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="relative w-full h-[45px] sm:h-[50px] pl-12 pr-4 flex items-center justify-between rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm sm:text-base"
      >
        <span className="truncate">
          {selectedStudents.length > 0 
            ? `Обрано дітей: ${selectedStudents.length}` 
            : language === 'uk' ? 'Оберіть дитину...' : 'Select students...'}
        </span>
        <svg className="shrink-0 size-3.5 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 15 5 5 5-5"/>
          <path d="m7 9 5-5 5 5"/>
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute left-0 right-0 mt-2 z-50 w-full max-h-72 bg-white dark:bg-[#121621] border border-[#d2d2d7] dark:border-[#2a3241] rounded-xl shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="sticky top-0 p-2 bg-white dark:bg-[#121621] border-b border-[#d2d2d7] dark:border-[#2a3241]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6e73] dark:text-[#86868b]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onKeyDown={(e) => {
                  // Enter tarayıcının örtük form gönderimini tetikliyordu:
                  // arama yazarken Enter'a basmak dersi anında oluşturuyordu.
                  // stopPropagation React olayını durdurur, tarayıcıyı değil.
                  if (e.key === 'Enter') e.preventDefault()
                  e.stopPropagation()
                }}
                onFocus={(e) => e.stopPropagation()}
                autoFocus
                placeholder={language === 'uk' ? 'Пошук...' : 'Search...'}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] dark:focus:border-[#0071e3] transition-colors text-sm"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-[calc(18rem-48px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
            {filteredStudents.map((student) => {
              const isSelected = selectedStudents.some(s => s.value === student.value)
              return (
                <div
                  key={student.value}
                  onClick={() => toggleStudent(student)}
                  className={`
                    flex items-center justify-between px-4 py-2 cursor-pointer
                    ${isSelected 
                      ? 'bg-gray-100 dark:bg-[#1d2535]' 
                      : 'hover:bg-gray-50 dark:hover:bg-[#1d2535]/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isSelected 
                        ? 'border-[#1d1d1f] bg-[#1d1d1f] dark:border-[#0071e3] dark:bg-[#0071e3]' 
                        : 'border-[#d2d2d7] dark:border-[#2a3241]'
                      }
                    `}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2 6 5 9 10 3"></polyline>
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {student.label}
                      </div>
                      <div className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                        {student.parent}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#0071e3] dark:text-[#0071e3] ml-4">
                    {student.age}
                  </span>
                </div>
              )
            })}
          </div>
      </div>
      )}
    </div>
  )

  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        date: new Date(),
        time: {
          hour: '',
          minute: ''
        },
        ageGroup: '',
        teacherId: '',
        maxCapacity: DEFAULT_CAPACITY,
        topic: '',
        students: []
      })
      setSelectedStudents([]) // Seçili öğrencileri sıfırla
      setSearchTerm('') // Arama terimini de sıfırla
    } else {
      // Eğer tarih ve saat seçilmişse, formu güncelle
      setFormData(prev => ({ 
        ...prev, 
        date: selectedDate ? new Date(selectedDate) : new Date(),
        time: {
          hour: selectedTime?.hour || '',
          minute: selectedTime?.minute || ''
        }
      }))
    }
  }, [isOpen, selectedDate, selectedTime])

  // Form gönderme
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsLoading(true);
    try {
      // Form verilerini hazırla
      const submissionData = {
        date: formData.date,
        time: {
          hour: formData.time.hour,
          minute: formData.time.minute
        },
        ageGroup: formData.ageGroup,
        teacherId: formData.teacherId,
        maxCapacity: formData.maxCapacity,
        topic: formData.topic,
        students: selectedStudents
      };

      // onSuccess callback'ini çağır
      if (onSuccess) {
        await onSuccess(submissionData);
      }
    } catch (error) {
      console.error('Form gönderilirken hata:', error);
      alert(language === 'uk' 
        ? 'Помилка створення заняття: ' + error.message 
        : 'An error occurred while creating the event: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Form validasyonu
  const isFormValid = () => {
    // Saat/dakika yalnızca "boş değil" diye değil, GERÇEKTEN seçilebilir
    // değerlerden biri mi diye kontrol ediliyor. Ay görünümünden gelen
    // tarih-only değer 09-18 dışında bir saat üretebiliyordu.
    if (!formData.date ||
        !hours.includes(formData.time.hour) ||
        !minutes.includes(formData.time.minute) ||
        !formData.ageGroup ||
        !formData.teacherId) {
      return false
    }

    if (formData.students.length === 0) {
      return false
    }

    // Kontenjandan fazla öğrenci seçilemesin: veritabanındaki
    // valid_capacity kısıtı (current_capacity <= max_capacity) zaten
    // reddeder ama kullanıcı bunu ancak kaydederken görürdü.
    if (formData.students.length > formData.maxCapacity) {
      return false
    }

    // Geçmiş tarih kontrolü
    const eventDateTime = new Date(formData.date)
    eventDateTime.setHours(parseInt(formData.time.hour))
    eventDateTime.setMinutes(parseInt(formData.time.minute))
    
    // Geçmiş tarih kontrolünü kaldırıyoruz
    // if (eventDateTime < new Date()) {
    //   return false
    // }

    return true
  }

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${!isOpen ? 'hidden' : ''}`}>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#121621] shadow-xl transition-all">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 border-b border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0071e3]/10 dark:bg-[#0071e3]/20 rounded-full flex items-center justify-center shrink-0">
                  <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0071e3]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-[#1d1d1f] dark:text-white">
                    {language === 'uk' ? 'Нове заняття' : 'New Event'}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#86868b]">
                    {language === 'uk' ? 'Створити нове заняття' : 'Create a new event'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content — panele sığmayan kısım burada kayar */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
              <div className="max-w-xl mx-auto space-y-5">
                {/* Tarih ve Saat */}
                <div className="space-y-4">
                  {/* Tarih */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {language === 'uk' ? 'Дата' : 'Date'}
                    </label>
                    <div className="relative create-event-datepicker">
                      <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e6e73] dark:text-[#86868b] z-10" />
                        <DatePicker
                          portalId="root"
                          selected={formData.date}
                          onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                          dateFormat="dd.MM.yyyy"
                          locale={language === 'uk' ? 'uk' : 'en'}
                          highlightDates={[new Date()]}
                          className="w-full h-[45px] sm:h-[50px] pl-12 pr-4 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm sm:text-base cursor-pointer"
                        />
                    </div>

                    <style>{`
                      .create-event-datepicker .react-datepicker__navigation {
                        top: 20px !important;
                      }
                      
                      .dark .react-datepicker__current-month {
                        color: white !important;
                      }
                      
                      .dark .react-datepicker__day-name {
                        color: white !important;
                      }
                    `}</style>
                  </div>

                  {/* Saat */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {language === 'uk' ? 'Час' : 'Time'}
                    </label>
                    <div className="flex gap-4">
                      {/* Saat Seçimi */}
                      <div className="flex-[7] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'uk' ? 'Час' : 'Hour'}
                          </span>
                        </div>
                        {/* 7 sutun: 13 saat iki satira siger (09-15 / 16-21).
                            5 sutunda uc satir oluyor ve modal gereksiz uzuyordu. */}
                        <div className="grid grid-cols-7 gap-1">
                          {hours.map((hour) => (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                time: { ...prev.time, hour }
                              }))}
                              className={`
                                h-9 rounded-lg text-sm font-medium transition-colors
                                ${formData.time.hour === hour
                                  ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                                  : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                                }
                              `}
                            >
                              {hour}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dakika Seçimi */}
                      {/* 7'ye 2: saat ızgarası 7, dakika ızgarası 2 sütun.
                          Oranlar sütun sayısıyla aynı olunca iki taraftaki
                          butonlar da aynı genişlikte çıkıyor. */}
                      <div className="flex-[2] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'uk' ? 'Хвилин' : 'Minute'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {minutes.map((minute) => (
                            <button
                              key={minute}
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                time: { ...prev.time, minute }
                              }))}
                              className={`
                                h-9 rounded-lg text-sm font-medium transition-colors
                                ${formData.time.minute === minute
                                  ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                                  : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                                }
                              `}
                            >
                              {minute}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Öğrenciler */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                    {language === 'uk' ? 'Діти' : 'Students'}
                  </label>
                  <div className="relative">
                    <UsersIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e6e73] dark:text-[#86868b] z-10" />
                    <CustomDropdown />
                    </div>
                  </div>

                  {/* Sınıf */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {language === 'uk' ? 'Клас' : 'Grade'}
                    </label>
                    {/* 5 sütun: 9 sınıf üç satır yerine ikiye iniyor */}
                    <div className="grid grid-cols-5 gap-2">
                      {GRADE_OPTIONS.map((grade) => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, ageGroup: grade }))}
                          className={`
                            h-9 rounded-lg text-sm font-medium transition-colors
                            ${formData.ageGroup === grade
                              ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                              : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                            }
                          `}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ders konusu. Haftanın konusundan (weekly_themes) ayrı:
                      o tüm okul için haftada tek değer, bu derse özel. */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {language === 'uk' ? 'Тема заняття' : 'Lesson Topic'}
                    </label>
                    <input
                      type="text"
                      value={formData.topic}
                      onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                      maxLength={200}
                      placeholder={language === 'uk' ? 'Напр.: Present Simple, сімʼя' : 'e.g. Present Simple, family'}
                      className="w-full h-11 px-4 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm"
                    />
                  </div>

                  {/* Kapasite — çoğunlukla 4 kişilik grup; talebe göre özel ders de açılıyor */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {language === 'uk' ? 'Кількість місць' : 'Capacity'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CAPACITY_OPTIONS.map((capacity) => (
                        <button
                          key={capacity}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, maxCapacity: capacity }))}
                          className={`
                            h-9 rounded-lg text-sm font-medium transition-colors
                            ${formData.maxCapacity === capacity
                              ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                              : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                            }
                          `}
                        >
                          {formatCapacity(capacity, language)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dersi veren öğretmen — ders tipi seçicisinin yerini aldı.
                      Kart rengi de bu kişiden geliyor. */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {language === 'uk' ? 'Викладач' : 'Teacher'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {teachers.map((teacher) => {
                        const active = formData.teacherId === teacher.id
                        return (
                          <button
                            key={teacher.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, teacherId: teacher.id }))}
                            className={`
                              h-9 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 truncate
                              ${active
                                ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                                : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                              }
                            `}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: teacher.color }}
                            />
                            <span className="truncate">{teacher.full_name || teacher.email}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>


              </div>
            </div>

            {/* Footer — her zaman görünür kalır */}
            <div className="p-4 sm:p-6 border-t border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 sm:h-10 w-full bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {language === 'uk' ? 'Скасувати' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="h-11 sm:h-10 w-full bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  disabled={!isFormValid() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{language === 'uk' ? 'Створення' : 'Creating'}</span>
                    </>
                  ) : (
                    <>
                      <CalendarDaysIcon className="w-4 h-4" />
                      <span>{language === 'uk' ? 'Створити' : 'Create'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 