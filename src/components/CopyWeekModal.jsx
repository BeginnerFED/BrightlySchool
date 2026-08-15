import React, { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  CalendarDaysIcon,
  ExclamationCircleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import DatePicker, { registerLocale } from 'react-datepicker'
import { tr, enUS } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { format, addWeeks, startOfWeek } from 'date-fns'
import { useLanguage } from '../context/LanguageContext'

// Tarih seçici lokalizasyonlarını kaydet
registerLocale('tr', tr)
registerLocale('en', enUS)

const PRECHECK_VISIBLE_LIMIT = 5

export default function CopyWeekModal({
  isOpen,
  onClose,
  onConfirm,
  currentWeekStart,
  hasConflicts = false,
  precheckStudents = [],
  precheckLoading = false,
  onExtendStudent
}) {
  const { language } = useLanguage()
  const isTr = language === 'tr'
  // Tarih seçeneği: 1 hafta sonra, 2 hafta sonra, özel tarih
  const [targetOption, setTargetOption] = useState('next-week')
  const [customDate, setCustomDate] = useState(addWeeks(new Date(currentWeekStart), 1))
  const [isLoading, setIsLoading] = useState(false)
  const [isPrecheckExpanded, setIsPrecheckExpanded] = useState(false)
  // Kopyalamaya dahil EDİLMEYECEK öğrencilerin kayıt id'leri
  const [excludedIds, setExcludedIds] = useState([])

  const toggleExcluded = (registrationId) => {
    setExcludedIds(prev => prev.includes(registrationId)
      ? prev.filter(id => id !== registrationId)
      : [...prev, registrationId])
  }
  
  // Seçilen hedef tarihi hesapla
  const getTargetWeekStart = () => {
    if (targetOption === 'next-week') {
      return addWeeks(new Date(currentWeekStart), 1)
    } else if (targetOption === 'after-next-week') {
      return addWeeks(new Date(currentWeekStart), 2)
    } else {
      // Özel tarih seçildiğinde, o haftanın başlangıcını döndür
      return startOfWeek(new Date(customDate), { weekStartsOn: 1 }) // Pazartesi başlangıç
    }
  }
  
  // Tarih formatlama
  const formatDate = (date) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: isTr ? tr : enUS })
  }
  
  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!isOpen) {
      setTargetOption('next-week')
      setCustomDate(addWeeks(new Date(currentWeekStart), 1))
      setIsLoading(false)
      setIsPrecheckExpanded(false)
      setExcludedIds([])
    }
  }, [isOpen, currentWeekStart])
  
  // Onaylama işlemi
  const handleConfirm = () => {
    setIsLoading(true)
    
    // Hedef haftanın başlangıç tarihini hesapla
    const targetDate = getTargetWeekStart()
    
    // Onaylama işlemini başlat (hariç tutulan öğrenciler katılımcı olarak eklenmez)
    onConfirm(targetDate, excludedIds)
  }
  
  // Overlay içeriği
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-[#121621] rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
            <div className="flex items-center gap-3">
              <DocumentDuplicateIcon className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <h2 className="font-medium text-lg text-[#1d1d1f] dark:text-white">
                {isTr ? 'Bu Haftayı Kopyala' : 'Copy This Week'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#86868b] dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content — gövde kaydırılır, header ve footer sabit kalır */}
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Kaynak Hafta Bilgisi */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-[#1d2535] rounded-xl">
              <div className="text-sm font-medium text-[#6e6e73] dark:text-[#86868b] mb-1">
                {isTr ? 'Kopyalanacak Hafta' : 'Week to Copy'}
              </div>
              <div className="text-base font-medium text-[#1d1d1f] dark:text-white">
                {isTr ? `${formatDate(currentWeekStart)} haftası` : `Week of ${formatDate(currentWeekStart)}`}
              </div>
            </div>
            
            {/* Radyo Grup */}
            <div className="mb-6">
              <div className="text-sm font-medium text-[#6e6e73] dark:text-[#86868b] mb-3">
                {isTr ? 'Kopyalama Hedefi' : 'Copy Target'}
              </div>
              
              {/* Sonraki Hafta */}
              <label className="block mb-3 cursor-pointer">
                <div className={`
                  flex items-center p-4 border rounded-xl transition-colors
                  ${targetOption === 'next-week' 
                    ? 'border-[#0071e3] dark:border-[#0071e3] bg-blue-50/30 dark:bg-[#0071e3]/5' 
                    : 'border-[#d2d2d7] dark:border-[#2a3241] hover:bg-gray-50 dark:hover:bg-[#1d2535]/50'}
                `}>
                  <input
                    type="radio"
                    name="target-option"
                    value="next-week"
                    checked={targetOption === 'next-week'}
                    onChange={() => setTargetOption('next-week')}
                    className="sr-only"
                  />
                  <div className={`
                    w-5 h-5 rounded-full flex items-center justify-center border-2 mr-3
                    ${targetOption === 'next-week' 
                      ? 'border-[#0071e3] dark:border-[#0071e3]' 
                      : 'border-[#d2d2d7] dark:border-[#2a3241]'}
                  `}>
                    {targetOption === 'next-week' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3] dark:bg-[#0071e3]"></div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {isTr ? 'Sonraki Hafta' : 'Next Week'}
                    </div>
                    <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                      {isTr
                        ? `${formatDate(addWeeks(new Date(currentWeekStart), 1))} haftası`
                        : `Week of ${formatDate(addWeeks(new Date(currentWeekStart), 1))}`}
                    </div>
                  </div>
                </div>
              </label>
              
              {/* 2 Hafta Sonra */}
              <label className="block mb-3 cursor-pointer">
                <div className={`
                  flex items-center p-4 border rounded-xl transition-colors
                  ${targetOption === 'after-next-week' 
                    ? 'border-[#0071e3] dark:border-[#0071e3] bg-blue-50/30 dark:bg-[#0071e3]/5' 
                    : 'border-[#d2d2d7] dark:border-[#2a3241] hover:bg-gray-50 dark:hover:bg-[#1d2535]/50'}
                `}>
                  <input
                    type="radio"
                    name="target-option"
                    value="after-next-week"
                    checked={targetOption === 'after-next-week'}
                    onChange={() => setTargetOption('after-next-week')}
                    className="sr-only"
                  />
                  <div className={`
                    w-5 h-5 rounded-full flex items-center justify-center border-2 mr-3
                    ${targetOption === 'after-next-week' 
                      ? 'border-[#0071e3] dark:border-[#0071e3]' 
                      : 'border-[#d2d2d7] dark:border-[#2a3241]'}
                  `}>
                    {targetOption === 'after-next-week' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3] dark:bg-[#0071e3]"></div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {isTr ? '2 Hafta Sonra' : 'In 2 Weeks'}
                    </div>
                    <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                      {isTr
                        ? `${formatDate(addWeeks(new Date(currentWeekStart), 2))} haftası`
                        : `Week of ${formatDate(addWeeks(new Date(currentWeekStart), 2))}`}
                    </div>
                  </div>
                </div>
              </label>
              
              {/* Özel Tarih */}
              <label className="block cursor-pointer">
                <div className={`
                  p-4 border rounded-xl transition-colors
                  ${targetOption === 'custom-date' 
                    ? 'border-[#0071e3] dark:border-[#0071e3] bg-blue-50/30 dark:bg-[#0071e3]/5' 
                    : 'border-[#d2d2d7] dark:border-[#2a3241] hover:bg-gray-50 dark:hover:bg-[#1d2535]/50'}
                `}>
                  <div className="flex items-center mb-3">
                    <input
                      type="radio"
                      name="target-option"
                      value="custom-date"
                      checked={targetOption === 'custom-date'}
                      onChange={() => setTargetOption('custom-date')}
                      className="sr-only"
                    />
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center border-2 mr-3
                      ${targetOption === 'custom-date' 
                        ? 'border-[#0071e3] dark:border-[#0071e3]' 
                        : 'border-[#d2d2d7] dark:border-[#2a3241]'}
                    `}>
                      {targetOption === 'custom-date' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3] dark:bg-[#0071e3]"></div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                      {isTr ? 'Özel Tarih' : 'Custom Date'}
                    </div>
                  </div>
                  
                  {/* Tarih Seçici */}
                  <div className="relative">
                    <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e6e73] dark:text-[#86868b] z-10 pointer-events-none" />
                    <DatePicker
                      selected={customDate}
                      onChange={date => setCustomDate(date)}
                      dateFormat="d MMMM yyyy"
                      locale={isTr ? 'tr' : 'en'}
                      minDate={new Date()}
                      className={`
                        w-full h-10 pl-12 pr-4 rounded-xl border 
                        border-[#d2d2d7] dark:border-[#2a3241] 
                        bg-white dark:bg-[#121621] 
                        text-[#1d1d1f] dark:text-white 
                        focus:ring-2 focus:ring-[#0071e3] focus:border-transparent 
                        transition-all text-sm cursor-pointer
                        ${targetOption !== 'custom-date' ? 'opacity-50' : ''}
                      `}
                      disabled={targetOption !== 'custom-date'}
                      onFocus={() => setTargetOption('custom-date')}
                    />
                  </div>
                </div>
              </label>
            </div>
            
            {/* Ders Hakkı Bitmiş Öğrenciler — bilgilendirme amaçlı, kopyalamayı engellemez */}
            {precheckLoading && (
              <div className="mb-6 flex items-center gap-2 text-xs text-[#6e6e73] dark:text-[#86868b]">
                <div className="w-3.5 h-3.5 border-2 border-[#d2d2d7] dark:border-[#2a3241] border-t-[#0071e3] rounded-full animate-spin"></div>
                {isTr ? 'Ders hakları kontrol ediliyor…' : 'Checking lesson quotas…'}
              </div>
            )}

            {!precheckLoading && precheckStudents.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
                <div className="flex items-start gap-3 mb-3">
                  <ExclamationCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                  <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {isTr
                      ? `${precheckStudents.length} öğrencinin ders hakkı bitmiş`
                      : `${precheckStudents.length} student${precheckStudents.length === 1 ? '' : 's'} have no lessons left`}
                  </div>
                </div>

                {/* İç kaydırma yok: modal gövdesi zaten kaydırılıyor (iç içe scroll kötü his verir) */}
                <div className="space-y-2">
                  {(isPrecheckExpanded ? precheckStudents : precheckStudents.slice(0, PRECHECK_VISIBLE_LIMIT)).map(student => {
                    const isExcluded = excludedIds.includes(student.id)

                    return (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between gap-3 p-3 border rounded-xl transition-colors ${
                          isExcluded
                            ? 'bg-gray-50 dark:bg-[#1d2535]/60 border-[#d2d2d7] dark:border-[#2a3241]'
                            : 'bg-white dark:bg-[#121621] border-[#d2d2d7] dark:border-[#2a3241]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className={`text-sm font-medium truncate ${
                            isExcluded
                              ? 'text-[#a1a1a6] dark:text-[#6e6e73] line-through'
                              : 'text-[#1d1d1f] dark:text-white'
                          }`}>
                            {student.student_name}
                          </div>
                          <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                            {isExcluded
                              ? (isTr ? 'Bu haftaya eklenmeyecek' : 'Will not be added to this week')
                              : isTr
                                ? `Kalan ders 0 · paket bitişi ${formatDate(student.package_end_date)}`
                                : `0 lessons left · package ended ${formatDate(student.package_end_date)}`}
                          </div>
                        </div>

                        {isExcluded ? (
                          <button
                            onClick={() => toggleExcluded(student.id)}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-[#0071e3] hover:bg-[#0071e3]/5 active:scale-95 transition-all"
                          >
                            {isTr ? 'Geri Al' : 'Undo'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => toggleExcluded(student.id)}
                              title={isTr ? 'Bu öğrenci kopyalanan derslere eklenmesin' : 'Do not add this student to the copied lessons'}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#6e6e73] dark:text-[#86868b] border border-[#d2d2d7] dark:border-[#2a3241] hover:text-[#1d1d1f] dark:hover:text-white hover:border-[#6e6e73] active:scale-95 transition-all"
                            >
                              {isTr ? 'Hariç Tut' : 'Exclude'}
                            </button>
                            <button
                              onClick={() => onExtendStudent && onExtendStudent(student)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-800/50 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 active:scale-95 transition-all"
                            >
                              {isTr ? 'Uzat' : 'Extend'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {precheckStudents.length > PRECHECK_VISIBLE_LIMIT && (
                  <button
                    onClick={() => setIsPrecheckExpanded(!isPrecheckExpanded)}
                    className="mt-2 text-xs font-medium text-yellow-800 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-200 transition-colors"
                  >
                    {isPrecheckExpanded
                      ? (isTr ? 'Daha az göster' : 'Show less')
                      : isTr
                        ? `+${precheckStudents.length - PRECHECK_VISIBLE_LIMIT} kişi daha`
                        : `+${precheckStudents.length - PRECHECK_VISIBLE_LIMIT} more`}
                  </button>
                )}

                <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-300/80">
                  {excludedIds.length > 0
                    ? (isTr
                      ? `${excludedIds.length} öğrenci kopyalanan derslere eklenmeyecek, diğer herkes kopyalanır.`
                      : `${excludedIds.length} student${excludedIds.length === 1 ? '' : 's'} will not be added to the copied lessons; everyone else is copied.`)
                    : (isTr
                      ? 'Kopyalama bu öğrencileri de kapsar.'
                      : 'These students are included in the copy.')}
                </div>
              </div>
            )}

            {/* Çakışma Uyarısı */}
            {hasConflicts && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
                <div className="flex items-start gap-3">
                  <ExclamationCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      {isTr ? 'Çakışma Uyarısı' : 'Conflict Warning'}
                    </div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300/80">
                      {isTr
                        ? 'Seçtiğiniz haftada zaten etkinlikler mevcut. Etkinlikler kopyalanırken mevcut etkinliklerle çakışmalar kontrol edilecek. Çakışma durumunda, ilgili etkinlikler kopyalanmayacak.'
                        : 'The selected week already has events. Conflicts will be checked during copying and conflicting events will be skipped.'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#d2d2d7] dark:border-[#2a3241] flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-[#1d1d1f] dark:text-white bg-transparent border border-[#d2d2d7] dark:border-[#2a3241] text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-[#1d2535]/70 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTr ? 'İptal' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              // Ders hakkı kontrolü bitmeden kopyalanmasın: hızlı tıklayan kullanıcı
              // uyarıyı görmeden kopyalayabilirdi
              disabled={isLoading || precheckLoading}
              title={precheckLoading ? (isTr ? 'Ders hakları kontrol ediliyor…' : 'Checking lesson quotas…') : undefined}
              className={`px-4 py-2 bg-[#1d1d1f] dark:bg-[#0071e3] text-white text-sm font-medium rounded-lg hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed ${isLoading || precheckLoading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isTr ? 'Kopyalanıyor...' : 'Copying...'}</span>
                </>
              ) : (
                <span>{isTr ? 'Haftayı Kopyala' : 'Copy Week'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
} 