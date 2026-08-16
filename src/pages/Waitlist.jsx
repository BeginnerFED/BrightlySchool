import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
import { LESSON_COUNT_OPTIONS, formatLessonCount } from '../lib/lessonCounts'
import Masonry from 'react-masonry-css'
import { 
  UserPlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  PhoneIcon,
  CalendarDaysIcon,
  CubeIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilSquareIcon,
  TrashIcon,
  CakeIcon
} from '@heroicons/react/24/outline'
import Toast from '../components/ui/Toast'
import CreateWaitlistModal from '../components/CreateWaitlistModal'
import UpdateWaitlistModal from '../components/UpdateWaitlistModal'
import DeleteWaitlistModal from '../components/DeleteWaitlistModal'

// Supabase istemcisini oluştur
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function Waitlist() {
  const { language } = useLanguage()
  const [waitlist, setWaitlist] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    lessonCount: ''
  })
  const [toast, setToast] = useState({
    message: '',
    type: 'success',
    isVisible: false
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState(null)

  // Bekleme listesini getir
  const fetchWaitlist = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false })

      // Status filtresi
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      // Paket türü filtresi
      if (filters.lessonCount) {
        query = query.eq('lesson_count', filters.lessonCount)
      }

      const { data, error } = await query

      if (error) throw error
      setWaitlist(data)
    } catch (error) {
      console.error('Bekleme listesi getirilirken hata:', error.message)
      showToast(
        language === 'uk'
          ? 'Помилка завантаження списку очікування.'
          : 'An error occurred while fetching the waitlist.',
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Sayfa yüklendiğinde ve filtreler değiştiğinde listeyi getir
  useEffect(() => {
    fetchWaitlist()
  }, [filters])

  // Toast gösterme fonksiyonu
  const showToast = (message, type = 'success') => {
    setToast({
      message,
      type,
      isVisible: true
    })
  }

  // Toast kapatma fonksiyonu
  const closeToast = () => {
    setToast(prev => ({
      ...prev,
      isVisible: false
    }))
  }

  // Durumu formatla
  const formatStatus = (status) => {
    const statuses = {
      'beklemede': language === 'uk' ? 'Очікує' : 'Waiting',
      'iletisime-gecildi': language === 'uk' ? 'Звʼязалися' : 'Contacted'
    }
    return statuses[status] || status
  }

  // Tarihi formatla
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Filtrelenmiş listeyi al
  const filteredWaitlist = waitlist.filter(entry => {
    const searchLower = searchTerm.toLowerCase()
    return (
      entry.student_name.toLowerCase().includes(searchLower) ||
      entry.parent_name.toLowerCase().includes(searchLower) ||
      entry.parent_phone.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] py-4 sm:py-0 gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium text-[#1d1d1f] dark:text-white">
            {language === 'uk' ? 'Список очікування' : 'Waitlist'}
            <span className="ml-2 text-sm font-normal text-[#6e6e73] dark:text-[#86868b]">
              ({filteredWaitlist.length})
            </span>
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          {/* Arama */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              type="text"
              placeholder={language === 'uk' ? 'Пошук за імʼям або телефоном...' : 'Search by name or phone...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 sm:h-8 pl-9 pr-4 rounded-lg text-sm border border-[#d2d2d7] dark:border-[#2a3241] bg-white/80 dark:bg-[#121621] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:ring-0 focus:border-[#0071e3] dark:focus:border-[#0071e3] transition-colors"
            />
          </div>

          {/* Filtre Butonu */}
          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className="h-10 sm:h-8 px-3 bg-white dark:bg-[#121621] text-[#424245] dark:text-[#86868b] text-sm font-medium rounded-lg border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] focus:outline-none transition-colors flex items-center justify-center gap-2 relative"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            {(filters.status || filters.lessonCount) && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#0071e3] rounded-full ring-2 ring-white dark:ring-[#121621]" />
            )}
          </button>

          {/* Yeni Kayıt Butonu */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-10 sm:h-8 px-4 bg-[#1d1d1f] dark:bg-[#0071e3] text-white text-sm font-medium rounded-lg hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>{language === 'uk' ? 'Нова реєстрація' : 'New Entry'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          // Loading State
          <Masonry
            breakpointCols={{
              default: 4,
              1280: 3,
              1024: 2,
              640: 1
            }}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6"
          >
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="mb-6 bg-white dark:bg-[#121621] rounded-2xl p-5 border border-[#d2d2d7] dark:border-[#2a3241] relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Kart Başlığı Skeleton */}
                  <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                    <div className="space-y-2">
                      <div className="h-[18px] w-32 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg animate-pulse" />
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full animate-pulse" />
                        <div className="h-[16px] w-24 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg animate-pulse" />
                      </div>
                    </div>
                    <div className="h-[28px] w-28 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg animate-pulse" />
                  </div>

                  {/* Kart Detayları Skeleton */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[18px] h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full animate-pulse" />
                      <div className="h-[16px] w-40 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg animate-pulse" />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-[18px] h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full animate-pulse" />
                      <div className="h-[16px] w-24 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg animate-pulse" />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-[18px] h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full animate-pulse" />
                      <div className="h-[16px] w-36 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg animate-pulse" />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-[18px] h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full animate-pulse" />
                      <div className="h-[16px] w-32 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Masonry>
        ) : filteredWaitlist.length === 0 ? (
          // Boş State
          <div className="text-center py-12">
            <UserIcon className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
            <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
              {language === 'uk' ? 'Записів не знайдено' : 'No Records Found'}
            </h3>
            <p className="text-sm text-[#6e6e73] dark:text-[#86868b]">
              {searchTerm 
                ? (language === 'uk' ? 'За вашим запитом нічого не знайдено.' : 'No records match your search criteria.')
                : (language === 'uk' ? 'Записів ще немає.' : 'No records have been added yet.')}
            </p>
          </div>
        ) : (
          // Bekleme Listesi Kartları
          <Masonry
            breakpointCols={{
              default: 4,
              1280: 3,
              1024: 2,
              640: 1
            }}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6"
          >
            {filteredWaitlist.map((entry) => (
              <div
                key={entry.id}
                className="mb-6 group bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] hover:shadow-lg dark:hover:shadow-[#0071e3]/10 transition-all duration-200 relative overflow-hidden"
              >
                <div className="p-5">
                  <div className="space-y-4">
                    {/* Kart Başlığı */}
                    <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                      <div>
                        <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                          {entry.parent_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <PhoneIcon className="w-4 h-4 text-[#86868b]" />
                          <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b]">
                            {entry.parent_phone}
                          </p>
                        </div>
                      </div>
                      <div className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium
                        ${entry.status === 'beklemede' 
                          ? 'bg-[#ffd60a]/10 text-[#946800] dark:text-[#ffd60a] dark:bg-[#ffd60a]/10 ring-1 ring-[#574800]/20 dark:ring-[#ffd60a]/20'
                          : 'bg-[#34c759]/10 text-[#1c7430] dark:bg-[#32d74b]/10 dark:text-[#32d74b] ring-1 ring-[#00390e]/20 dark:ring-[#32d74b]/20'
                        }
                      `}>
                        {entry.status === 'beklemede' ? (
                          <ClockIcon className="w-4 h-4" />
                        ) : (
                          <CheckCircleIcon className="w-4 h-4" />
                        )}
                        {formatStatus(entry.status)}
                      </div>
                    </div>

                    {/* Kart Detayları */}
                    <div className="space-y-3 text-[13px]">
                      <div className="flex items-center gap-2.5 text-[#424245] dark:text-[#86868b]">
                        <UserIcon className="w-[18px] h-[18px] shrink-0" />
                        <span>{entry.student_name}</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-[#424245] dark:text-[#86868b]">
                        <CakeIcon className="w-[18px] h-[18px] shrink-0" />
                        <span>{entry.student_age}</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-[#424245] dark:text-[#86868b]">
                        <CubeIcon className="w-[18px] h-[18px] shrink-0" />
                        <span>{formatLessonCount(entry.lesson_count, language)}</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-[#424245] dark:text-[#86868b]">
                        <CalendarDaysIcon className="w-[18px] h-[18px] shrink-0" />
                        <span>{formatDate(entry.contact_date)}</span>
                      </div>

                      {entry.notes && (
                        <p className="text-[12px] text-[#6e6e73] dark:text-[#86868b] mt-3 italic border-t border-[#d2d2d7] dark:border-[#424245] pt-3">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="h-0 group-hover:h-[45px] opacity-0 group-hover:opacity-100 border-t border-[#d2d2d7] dark:border-[#2a3241] transition-all duration-200 overflow-hidden">
                  <div className="flex items-center divide-x divide-[#d2d2d7] dark:divide-[#2a3241]">
                    <button
                      onClick={() => {
                        setSelectedEntry(entry)
                        setIsUpdateModalOpen(true)
                      }}
                      className="flex-1 h-11 flex items-center justify-center gap-2 text-[#424245] dark:text-[#86868b] hover:text-[#0071e3] dark:hover:text-[#0071e3] hover:bg-[#0071e3]/5 dark:hover:bg-[#0071e3]/10 font-medium transition-colors text-sm"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      <span>{language === 'uk' ? 'Оновити' : 'Update'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setEntryToDelete(entry)
                        setIsDeleteModalOpen(true)
                      }}
                      className="flex-1 h-11 flex items-center justify-center gap-2 text-[#424245] dark:text-[#86868b] hover:text-red-500 dark:hover:text-red-500 hover:bg-red-500/5 dark:hover:bg-red-500/10 font-medium transition-colors text-sm"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>{language === 'uk' ? 'Видалити' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </Masonry>
        )}
      </div>

      {/* Filter Sheet */}
      <div className={`
        fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-[#121621] shadow-xl transform transition-transform duration-300 ease-in-out z-50
        ${isFilterSheetOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Sheet Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <h2 className="text-lg font-medium text-[#1d1d1f] dark:text-white">
              {language === 'uk' ? 'Фільтри' : 'Filters'}
            </h2>
            <button
              onClick={() => setIsFilterSheetOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
          </div>

          {/* Sheet Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Durum Filtresi */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'uk' ? 'Статус' : 'Status'}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, status: 'beklemede' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors
                    ${filters.status === 'beklemede'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'uk' ? 'Очікує' : 'Waiting'}
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, status: 'iletisime-gecildi' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors
                    ${filters.status === 'iletisime-gecildi'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'uk' ? 'Звʼязалися' : 'Contacted'}
                </button>
              </div>
            </div>

            {/* Ders sayısı filtresi — seçenekler lib/lessonCounts.js'te */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'uk' ? 'Кількість занять' : 'Lesson Count'}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {LESSON_COUNT_OPTIONS.map(count => (
                  <button
                    key={count}
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      lessonCount: prev.lessonCount === count ? '' : count
                    }))}
                    className={`
                      h-9 px-2 rounded-lg text-sm font-medium transition-colors
                      ${filters.lessonCount === count
                        ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                        : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                      }
                    `}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <div className="px-6 py-4 border-t border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setFilters({ status: '', lessonCount: '' })
                  setIsFilterSheetOpen(false)
                }}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none transition-colors"
              >
                {language === 'uk' ? 'Очистити фільтри' : 'Clear Filters'}
              </button>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 h-10 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-colors"
              >
                {language === 'uk' ? 'Застосувати' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40"
          onClick={() => setIsFilterSheetOpen(false)}
        />
      )}

      {/* Create Modal */}
      <CreateWaitlistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(message, type) => {
          showToast(message, type)
          if (type === 'success') {
            fetchWaitlist()
          }
        }}
      />

      {/* Update Modal */}
      <UpdateWaitlistModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false)
          setSelectedEntry(null)
        }}
        onSuccess={(message, type) => {
          showToast(message, type)
          if (type === 'success') {
            fetchWaitlist()
          }
        }}
        entry={selectedEntry}
      />

      {/* Delete Modal */}
      <DeleteWaitlistModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setEntryToDelete(null)
        }}
        onSuccess={(message, type) => {
          showToast(message, type)
          if (type === 'success') {
            fetchWaitlist()
          }
        }}
        entry={entryToDelete}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />
    </div>
  )
} 