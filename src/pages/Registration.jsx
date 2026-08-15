import React, { useState, useEffect } from 'react'
import RegisterModal from '../components/RegisterModal'
import UpdateModal from '../components/UpdateModal'
import ExtendModal from '../components/ExtendModal'
import { createClient } from '@supabase/supabase-js'
import Masonry from 'react-masonry-css'
import { useLanguage } from '../context/LanguageContext'
import { 
  UserPlusIcon, 
  CalendarDaysIcon, 
  CubeIcon,
  CreditCardIcon,
  PhoneIcon,
  UserIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  TrashIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon as HistoryIcon,
  ArrowUturnUpIcon,
  GiftIcon
} from '@heroicons/react/24/outline'
import DeleteRegisterModal from '../components/DeleteRegisterModal'
import DeleteExtensionModal from '../components/DeleteExtensionModal'
import Toast from '../components/ui/Toast'

// Supabase istemcisini oluştur
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function Registration() {
  const { language } = useLanguage()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    paymentStatus: '',
    packageType: '',
    showArchived: false
  })
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [registrationToDelete, setRegistrationToDelete] = useState(null)
  const [toast, setToast] = useState({
    message: '',
    type: 'success',
    isVisible: false
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false)
  const [selectedHistoryRegistration, setSelectedHistoryRegistration] = useState(null)
  const [extensionHistory, setExtensionHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false)
  const [registrationToActivate, setRegistrationToActivate] = useState(null)
  const [isActivating, setIsActivating] = useState(false)
  const [isDeleteExtensionModalOpen, setIsDeleteExtensionModalOpen] = useState(false)
  const [isEditExtensionModalOpen, setIsEditExtensionModalOpen] = useState(false)
  const [selectedExtension, setSelectedExtension] = useState(null)
  const [selectedExtensionIndex, setSelectedExtensionIndex] = useState(null)

  // Kayıtları getir
  const fetchRegistrations = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('is_active', !filters.showArchived)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRegistrations(data)
    } catch (error) {
      console.error('Kayıtlar getirilirken hata:', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Sayfa yüklendiğinde ve filtreler değiştiğinde kayıtları getir
  useEffect(() => {
    fetchRegistrations()
  }, [filters.showArchived]) // filters.showArchived değiştiğinde kayıtları yeniden getir

  // Paket türünü formatla
  const formatPackageType = (type) => {
    const types = {
      'tek-seferlik': language === 'tr' ? 'Tek Seferlik Katılım' : 'One Time Participation',
      'hafta-1': language === 'tr' ? 'Haftada 1 Gün' : '1 Day Per Week',
      'hafta-2': language === 'tr' ? 'Haftada 2 Gün' : '2 Days Per Week',
      'hafta-3': language === 'tr' ? 'Haftada 3 Gün' : '3 Days Per Week',
      'hafta-4': language === 'tr' ? 'Haftada 4 Gün' : '4 Days Per Week',
      'ucretsiz': language === 'tr' ? 'Ücretsiz Katılım' : 'Free Participation'
    }
    return types[type] || type
  }

  // Ödeme durumunu formatla
  const formatPaymentStatus = (status) => {
    const statuses = {
      'odendi': language === 'tr' ? 'Ödendi' : 'Paid',
      'beklemede': language === 'tr' ? 'Beklemede' : 'Pending',
      'ucretsiz': language === 'tr' ? 'Ücretsiz' : 'Free'
    }
    return statuses[status] || status
  }

  // Ödeme yöntemini formatla
  const formatPaymentMethod = (method) => {
    const methods = {
      'banka': language === 'tr' ? 'Banka' : 'Bank',
      'nakit': language === 'tr' ? 'Nakit' : 'Cash',
      'kart': language === 'tr' ? 'Kredi Kartı' : 'Credit Card',
      'belirlenmedi': <span className="capitalize">{language === 'tr' ? 'belirlenmedi' : 'not specified'}</span>
    }
    return methods[method] || method
  }

  // Tarihi formatla
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Filtrelenmiş kayıtları al
  const filteredRegistrations = registrations.filter(registration => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = (
      registration.student_name.toLowerCase().includes(searchLower) ||
      registration.parent_name.toLowerCase().includes(searchLower) ||
      registration.parent_phone.toLowerCase().includes(searchLower)
    )

    const matchesPaymentStatus = !filters.paymentStatus || registration.payment_status === filters.paymentStatus
    const matchesPackageType = !filters.packageType || registration.package_type === filters.packageType

    return matchesSearch && matchesPaymentStatus && matchesPackageType
  })

  // Güncelleme modalını açma fonksiyonu
  const handleUpdateClick = (registration) => {
    setSelectedRegistration(registration)
    setIsUpdateModalOpen(true)
  }

  // Uzatma modalını açma fonksiyonu
  const handleExtendClick = (registration) => {
    if (registration.package_type === 'ucretsiz') {
      showToast(
        language === 'tr'
          ? 'Ücretsiz katılımlarda paket uzatma yapılmaz'
          : 'Package extension is not available for free participation',
        'error'
      );
      return;
    }
    if (registration.payment_status === 'beklemede') {
      showToast(
        language === 'tr' 
          ? "Uzatma işlemi için ödeme durumu 'Beklemede' olamaz"
          : "Payment status cannot be 'Pending' for extension",
        'error'
      );
      return;
    }
    setSelectedRegistration(registration)
    setIsExtendModalOpen(true)
  }

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

  // Silme modalını açma fonksiyonu
  const handleDeleteClick = (registration) => {
    setRegistrationToDelete(registration)
    setIsDeleteModalOpen(true)
  }

  // Kayıt silme fonksiyonu
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ is_active: false })
        .eq('id', registrationToDelete.id)

      if (error) throw error

      // Kayıtları yenile
      fetchRegistrations()
      
      // Modal'ı kapat
      setIsDeleteModalOpen(false)
      setRegistrationToDelete(null)

      // Başarılı mesajı göster
      showToast(
        language === 'tr' 
          ? `${registrationToDelete.student_name} isimli kayıt başarıyla arşivlendi.`
          : `Record for ${registrationToDelete.student_name} has been successfully archived.`
      )
    } catch (error) {
      console.error('Kayıt arşivlenirken hata:', error.message)
      showToast(
        language === 'tr'
          ? 'Kayıt arşivlenirken bir hata oluştu.'
          : 'An error occurred while archiving the record.',
        'error'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  // Geçmiş görüntüleme fonksiyonu
  const handleHistoryClick = async (registration) => {
    setSelectedHistoryRegistration(registration)
    setIsHistorySheetOpen(true)
    setIsHistoryLoading(true)

    try {
      // İlk kayıt için payment_date bilgisini al
      const { data: paymentData, error: paymentError } = await supabase
        .from('financial_records')
        .select('payment_date')
        .eq('registration_id', registration.id)
        .eq('transaction_type', 'initial_payment')
        .maybeSingle()

      // Ücretsiz katılımda finansal kayıt olmaz — geçmiş yine açılabilmeli
      if (paymentError && paymentError.code !== 'PGRST116') throw paymentError

      // Uzatma geçmişini al
      const { data: extensionData, error: extensionError } = await supabase
        .from('extension_history')
        .select('*')
        .eq('registration_id', registration.id)
        .order('created_at', { ascending: true })

      if (extensionError) throw extensionError

      // Registration objesine payment_date ekle
      setSelectedHistoryRegistration({
        ...registration,
        payment_date: paymentData?.payment_date
      })
      setExtensionHistory(extensionData)
    } catch (error) {
      console.error('Geçmiş kayıtlar getirilirken hata:', error.message)
      showToast(
        language === 'tr'
          ? 'Geçmiş kayıtlar getirilirken bir hata oluştu.'
          : 'An error occurred while fetching history records.',
        'error'
      )
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const handleActivateClick = (registration) => {
    setRegistrationToActivate(registration)
    setIsActivateModalOpen(true)
  }

  const handleActivate = async () => {
    setIsActivating(true)
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ is_active: true })
        .eq('id', registrationToActivate.id)

      if (error) throw error

      // Kayıtları yenile
      fetchRegistrations()
      
      // Modal'ı kapat
      setIsActivateModalOpen(false)
      setRegistrationToActivate(null)

      // Başarılı mesajı göster
      showToast(
        language === 'tr' 
          ? `${registrationToActivate.student_name} isimli kayıt başarıyla aktifleştirildi.`
          : `Record for ${registrationToActivate.student_name} has been successfully activated.`
      )
    } catch (error) {
      console.error('Kayıt aktifleştirilirken hata:', error.message)
      showToast(
        language === 'tr'
          ? 'Kayıt aktifleştirilirken bir hata oluştu.'
          : 'An error occurred while activating the record.',
        'error'
      )
    } finally {
      setIsActivating(false)
    }
  }

  return (
    <div>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] py-4 sm:py-0 gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium text-[#1d1d1f] dark:text-white">
              {language === 'tr' ? 'Kayıtlar' : 'Registrations'}
              <span className="ml-2 text-sm font-normal text-[#6e6e73] dark:text-[#86868b]">
                ({filteredRegistrations.length})
              </span>
            </h1>
            {filters.showArchived && (
              <span className="px-2 py-1 text-xs font-medium bg-[#ef4444]/10 text-[#ef4444] dark:bg-[#ef4444]/20 rounded-md">
                {language === 'tr' ? 'Arşiv' : 'Archive'}
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            {/* Arama */}
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input
                type="text"
                placeholder={language === 'tr' ? 'İsim veya telefon ile ara...' : 'Search by name or phone...'}
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
              {(filters.paymentStatus || filters.packageType || filters.showArchived) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#0071e3] rounded-full ring-2 ring-white dark:ring-[#121621]" />
              )}
            </button>

            {/* Yeni Kayıt Butonu */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-10 sm:h-8 px-4 bg-[#1d1d1f] dark:bg-[#0071e3] text-white text-sm font-medium rounded-lg hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlusIcon className="w-4 h-4" />
              <span>{language === 'tr' ? 'Yeni Kayıt' : 'New Registration'}</span>
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
                  {/* Kart Başlığı */}
                  <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                    <div>
                      <div className="h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-32 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div className="h-[16px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-20 mt-1.5 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>
                    <div className="h-[26px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg w-24 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                  </div>

                  {/* Kart Detayları */}
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div className="h-[16px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-40 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div className="h-[16px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-32 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div className="h-[16px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-36 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div className="h-[16px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-44 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div className="h-[16px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-40 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Masonry>
          ) : filteredRegistrations.length === 0 ? (
            // Boş State
            <div className="text-center py-12">
              <UserIcon className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
              <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
                {language === 'tr' ? 'Kayıt Bulunamadı' : 'No Records Found'}
              </h3>
              <p className="text-sm text-[#6e6e73] dark:text-[#86868b]">
                {searchTerm 
                  ? (language === 'tr' ? 'Arama kriterlerinize uygun kayıt bulunamadı.' : 'No records match your search criteria.')
                  : (language === 'tr' ? 'Henüz kayıt eklenmemiş.' : 'No records have been added yet.')}
              </p>
            </div>
          ) : (
            // Kayıt Kartları
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
              {filteredRegistrations.map((registration) => (
                <div
                  key={registration.id}
                  className="mb-6 group bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] hover:shadow-lg dark:hover:shadow-[#0071e3]/10 transition-all duration-200 relative overflow-hidden"
                >
                  <div className="p-5">
                    <div className="space-y-4">
                      {/* Kart Başlığı */}
                      <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                        <div>
                          <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                            {registration.student_name}
                          </h3>
                          <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                            {registration.student_age}
                          </p>
                        </div>
                        <div className={`
                          flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium
                          ${registration.payment_status === 'ucretsiz'
                            ? 'bg-gray-400/10 text-gray-700 dark:text-gray-300 ring-1 ring-gray-500/20 dark:ring-gray-400/20'
                            : registration.payment_status === 'odendi'
                            ? 'bg-[#34c759]/10 text-[#1c7430] dark:bg-[#32d74b]/10 dark:text-[#32d74b] ring-1 ring-[#00390e]/20 dark:ring-[#32d74b]/20'
                            : 'bg-[#ffd60a]/10 text-[#946800] dark:text-[#ffd60a] dark:bg-[#ffd60a]/10 ring-1 ring-[#574800]/20 dark:ring-[#ffd60a]/20'}
                        `}>
                          {registration.payment_status === 'ucretsiz' ? (
                            <GiftIcon className="w-4 h-4" />
                          ) : registration.payment_status === 'odendi' ? (
                            <CheckCircleIcon className="w-4 h-4" />
                          ) : (
                            <ClockIcon className="w-4 h-4" />
                          )}
                          {formatPaymentStatus(registration.payment_status)}
                        </div>
                      </div>

                      {/* Kart Detayları */}
                      <div className="space-y-3 text-[13px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-[#424245] dark:text-[#86868b]">
                            <UserIcon className="w-[18px] h-[18px] shrink-0" />
                            <span className="truncate">{registration.parent_name}</span>
                          </div>
                          {registration.extension_count > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleHistoryClick(registration)
                              }}
                              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors peer"
                            >
                              <HistoryIcon className="w-4 h-4 text-[#0071e3]" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-[#424245] dark:text-[#86868b]">
                          <PhoneIcon className="w-[18px] h-[18px] shrink-0" />
                          <span>{registration.parent_phone}</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-[#424245] dark:text-[#86868b]">
                          <CubeIcon className="w-[18px] h-[18px] shrink-0" />
                          <span>{formatPackageType(registration.package_type)}</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-[#424245] dark:text-[#86868b]">
                          <CalendarDaysIcon className="w-[18px] h-[18px] shrink-0" />
                          <span className="text-[12px]">
                            {registration.package_type === 'ucretsiz'
                              ? (language === 'tr' ? 'Süresiz' : 'Unlimited')
                              : `${formatDate(registration.package_start_date)} - ${formatDate(registration.package_end_date)}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 text-[#424245] dark:text-[#86868b]">
                          <CreditCardIcon className="w-[18px] h-[18px] shrink-0" />
                          <span>
                            {registration.package_type === 'ucretsiz' ? (
                              language === 'tr' ? 'Ücretsiz' : 'Free'
                            ) : (
                              <>
                                {formatPaymentMethod(registration.payment_method)} - {registration.payment_amount} ₺
                                {registration.payment_status === 'odendi' && registration.payment_date && (
                                  <> - {formatDate(registration.payment_date)}</>
                                )}
                              </>
                            )}
                          </span>
                        </div>

                        {registration.notes && (
                          <p className="text-[12px] text-[#6e6e73] dark:text-[#86868b] mt-3 italic border-t border-[#d2d2d7] dark:border-[#424245] pt-3">
                            {registration.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="h-0 group-hover:h-[45px] opacity-0 group-hover:opacity-100 border-t border-[#d2d2d7] dark:border-[#2a3241] transition-all duration-200 overflow-hidden">
                    {filters.showArchived ? (
                      <div className="flex items-center">
                        <button
                          onClick={() => handleActivateClick(registration)}
                          className="w-full h-11 flex items-center justify-center gap-2 font-medium transition-colors text-sm text-[#424245] dark:text-[#86868b] hover:text-[#0071e3] dark:hover:text-[#0071e3] hover:bg-[#0071e3]/5 dark:hover:bg-[#0071e3]/10"
                        >
                          <ArrowUturnUpIcon className="w-4 h-4" />
                          <span>{language === 'tr' ? 'Aktifleştir' : 'Activate'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center divide-x divide-[#d2d2d7] dark:divide-[#2a3241]">
                        <button
                          onClick={() => handleUpdateClick(registration)}
                          className="flex-1 h-11 flex items-center justify-center gap-2 font-medium transition-colors text-sm text-[#424245] dark:text-[#86868b] hover:text-[#0071e3] dark:hover:text-[#0071e3] hover:bg-[#0071e3]/5 dark:hover:bg-[#0071e3]/10"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                          <span>{language === 'tr' ? 'Güncelle' : 'Update'}</span>
                        </button>

                        {registration.package_type !== 'ucretsiz' && (
                          <button
                            onClick={() => handleExtendClick(registration)}
                            className="flex-1 h-11 flex items-center justify-center gap-2 font-medium transition-colors text-sm text-[#424245] dark:text-[#86868b] hover:text-[#34c759] dark:hover:text-[#32d74b] hover:bg-[#34c759]/5 dark:hover:bg-[#32d74b]/10"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                            <span>{language === 'tr' ? 'Uzat' : 'Extend'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteClick(registration)}
                          className="flex-1 h-11 flex items-center justify-center gap-2 font-medium transition-colors text-sm text-[#424245] dark:text-[#86868b] hover:text-[#ef4444] dark:hover:text-[#ef4444] hover:bg-[#ef4444]/5 dark:hover:bg-[#ef4444]/10"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span>{language === 'tr' ? 'Arşivle' : 'Archive'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Masonry>
          )}
        </div>
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
              {language === 'tr' ? 'Filtreler' : 'Filters'}
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
            {/* Geçmiş Öğrenciler Toggle */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Geçmiş Öğrenciler' : 'Past Students'}
              </h3>
              <button
                onClick={() => setFilters(prev => ({ ...prev, showArchived: !prev.showArchived }))}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors"
              >
                <span className="text-sm">
                  {language === 'tr' ? 'Arşivlenmiş kayıtları göster' : 'Show archived records'}
                </span>
                <div className={`
                  w-10 h-6 rounded-full transition-colors relative
                  ${filters.showArchived ? 'bg-[#1d1d1f] dark:bg-[#0071e3]' : 'bg-[#d2d2d7] dark:bg-[#424245]'}
                `}>
                  <div className={`
                    w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform
                    ${filters.showArchived ? 'translate-x-4' : 'translate-x-0.5'}
                  `} />
                </div>
              </button>
            </div>

            {/* Ödeme Durumu Filtresi */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Ödeme Durumu' : 'Payment Status'}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, paymentStatus: 'odendi' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors
                    ${filters.paymentStatus === 'odendi'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Ödendi' : 'Paid'}
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, paymentStatus: 'beklemede' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors
                    ${filters.paymentStatus === 'beklemede'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Beklemede' : 'Pending'}
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, paymentStatus: 'ucretsiz' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors
                    ${filters.paymentStatus === 'ucretsiz'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Ücretsiz' : 'Free'}
                </button>
              </div>
            </div>

            {/* Paket Türü Filtresi */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Paket Türü' : 'Package Type'}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, packageType: 'tek-seferlik' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors text-left
                    ${filters.packageType === 'tek-seferlik'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Tek Seferlik Katılım' : 'One Time Participation'}
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, packageType: 'hafta-1' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors text-left
                    ${filters.packageType === 'hafta-1'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Haftada 1 Gün' : '1 Day Per Week'}
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, packageType: 'hafta-2' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors text-left
                    ${filters.packageType === 'hafta-2'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Haftada 2 Gün' : '2 Days Per Week'}
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, packageType: 'hafta-3' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors text-left
                    ${filters.packageType === 'hafta-3'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Haftada 3 Gün' : '3 Days Per Week'}
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, packageType: 'hafta-4' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors text-left
                    ${filters.packageType === 'hafta-4'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Haftada 4 Gün' : '4 Days Per Week'}
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, packageType: 'ucretsiz' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors text-left
                    ${filters.packageType === 'ucretsiz'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Ücretsiz Katılım' : 'Free Participation'}
                </button>
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <div className="px-6 py-4 border-t border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setFilters({ paymentStatus: '', packageType: '', showArchived: false })
                  setIsFilterSheetOpen(false)
                }}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none transition-colors"
              >
                {language === 'tr' ? 'Filtreleri Temizle' : 'Clear Filters'}
              </button>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 h-10 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-colors"
              >
                {language === 'tr' ? 'Uygula' : 'Apply'}
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

      <RegisterModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRegistrations}
      />

      {/* Update Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false)
          setSelectedRegistration(null)
        }}
        onSuccess={fetchRegistrations}
        registration={selectedRegistration}
      />

      {/* Extend Modal */}
      <ExtendModal
        isOpen={isExtendModalOpen}
        onClose={() => {
          setIsExtendModalOpen(false)
          setSelectedRegistration(null)
        }}
        onSuccess={fetchRegistrations}
        registration={selectedRegistration}
      />

      {/* Edit Extension Modal */}
      <ExtendModal
        isOpen={isEditExtensionModalOpen}
        onClose={() => {
          setIsEditExtensionModalOpen(false)
          setSelectedExtension(null)
          setSelectedExtensionIndex(null)
        }}
        onSuccess={() => {
          fetchRegistrations()
          if (selectedHistoryRegistration) {
            handleHistoryClick(selectedHistoryRegistration)
          }
        }}
        registration={selectedHistoryRegistration}
        isEditMode={true}
        existingExtension={selectedExtension}
      />

      {/* Delete Extension Modal */}
      <DeleteExtensionModal
        isOpen={isDeleteExtensionModalOpen}
        onClose={() => {
          setIsDeleteExtensionModalOpen(false)
          setSelectedExtension(null)
          setSelectedExtensionIndex(null)
        }}
        onSuccess={(message, type) => {
          showToast(message, type)
          if (type === 'success') {
            fetchRegistrations()
            if (selectedHistoryRegistration) {
              handleHistoryClick(selectedHistoryRegistration)
            }
          }
        }}
        registration={selectedHistoryRegistration}
        extension={selectedExtension}
        extensionIndex={selectedExtensionIndex}
      />

      {/* Delete Confirmation Modal */}
      <DeleteRegisterModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setRegistrationToDelete(null)
        }}
        onConfirm={handleDelete}
        entry={registrationToDelete}
        isLoading={isDeleting}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />

      {/* History Sheet */}
      <div className={`
        fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-[#121621] shadow-xl transform transition-transform duration-300 ease-in-out z-50
        ${isHistorySheetOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Sheet Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <h2 className="text-lg font-medium text-[#1d1d1f] dark:text-white">
              {selectedHistoryRegistration && (
                language === 'tr' 
                  ? `${selectedHistoryRegistration.student_name} İçin Geçmiş Kayıtlar`
                  : `History Records for ${selectedHistoryRegistration.student_name}`
              )}
            </h2>
            <button
              onClick={() => {
                setIsHistorySheetOpen(false)
                setSelectedHistoryRegistration(null)
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
          </div>

          {/* Sheet Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isHistoryLoading ? (
              // Skeleton Loading
              <div className="relative before:content-[''] before:absolute before:left-[11px] before:top-[22px] before:bottom-[140px] before:border-l-2 before:border-dashed before:border-[#d2d2d7] dark:before:border-[#2a3241]">
                {/* İlk Kayıt Skeleton */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241]" />
                    <div className="h-5 w-24 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md " />
                    <div className="h-4 w-20 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md" />
                  </div>
                  <div className="ml-9 p-4 rounded-xl bg-[#f5f5f7] dark:bg-[#1d1d1f] space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#e5e5e5] dark:bg-[#2a3241]" />
                      <div className="h-4 w-48 bg-[#e5e5e5] dark:bg-[#2a3241] rounded-md" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#e5e5e5] dark:bg-[#2a3241]" />
                      <div className="h-4 w-36 bg-[#e5e5e5] dark:bg-[#2a3241] rounded-md" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#e5e5e5] dark:bg-[#2a3241]" />
                      <div className="h-4 w-40 bg-[#e5e5e5] dark:bg-[#2a3241] rounded-md" />
                    </div>
                  </div>
                </div>

                {/* Uzatma Kayıtları Skeleton */}
                {[...Array(2)].map((_, index) => (
                  <div key={index} className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241]" />
                      <div className="h-5 w-24 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md" />
                      <div className="h-4 w-20 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md" />
                    </div>
                    <div className="ml-9 p-4 rounded-xl bg-[#f5f5f7] dark:bg-[#1d1d1f] space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#e5e5e5] dark:bg-[#2a3241]" />
                        <div className="h-4 w-48 bg-[#e5e5e5] dark:bg-[#2a3241] rounded-md" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#e5e5e5] dark:bg-[#2a3241]" />
                        <div className="h-4 w-36 bg-[#e5e5e5] dark:bg-[#2a3241] rounded-md" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#e5e5e5] dark:bg-[#2a3241]" />
                        <div className="h-4 w-40 bg-[#e5e5e5] dark:bg-[#2a3241] rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              selectedHistoryRegistration && (
                <div className="relative before:content-[''] before:absolute before:left-[11px] before:top-[22px] before:bottom-[140px] before:border-l-2 before:border-dashed before:border-[#d2d2d7] dark:before:border-[#2a3241]">
                  {/* İlk Kayıt */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#0071e3] flex items-center justify-center shrink-0 relative z-10">
                        <UserPlusIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {language === 'tr' ? 'İlk Kayıt' : 'Initial Registration'}
                      </span>
                      <span className="text-xs text-[#86868b]">
                        {formatDate(selectedHistoryRegistration.created_at)}
                      </span>
                    </div>
                    <div className="ml-9 p-4 rounded-xl bg-[#f5f5f7] dark:bg-[#1d1d1f] space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CubeIcon className="w-4 h-4 text-[#86868b]" />
                        <span className="text-[#424245] dark:text-[#86868b]">
                          {formatPackageType(selectedHistoryRegistration.initial_package_type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDaysIcon className="w-4 h-4 text-[#86868b]" />
                        <span className="text-[#424245] dark:text-[#86868b]">
                          {formatDate(selectedHistoryRegistration.initial_start_date)} - {formatDate(selectedHistoryRegistration.initial_end_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCardIcon className="w-4 h-4 text-[#86868b]" />
                        <span className="text-[#424245] dark:text-[#86868b]">
                          {formatPaymentMethod(selectedHistoryRegistration.initial_payment_method)} - {selectedHistoryRegistration.initial_payment_amount} ₺
                          {selectedHistoryRegistration.payment_date && (
                            <> - {formatDate(selectedHistoryRegistration.payment_date)}</>
                          )}
                        </span>
                      </div>
                      {selectedHistoryRegistration.initial_notes && (
                        <div className="flex items-start gap-2 text-sm">
                          <PencilSquareIcon className="w-4 h-4 text-[#86868b] mt-0.5" />
                          <span className="text-[#424245] dark:text-[#86868b] italic">
                            {selectedHistoryRegistration.initial_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Uzatma Kayıtları */}
                  {selectedHistoryRegistration && extensionHistory.length > 0 && (
                    <div className="space-y-8">
                      {extensionHistory.map((history, index) => {
                        const isLast = index === extensionHistory.length - 1
                        return (
                        <div key={history.id}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-6 h-6 rounded-full bg-[#0071e3] flex items-center justify-center shrink-0 relative z-10">
                              <ArrowPathIcon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                              {language === 'tr' ? `${index + 1}. Uzatma` : `Extension #${index + 1}`}
                            </span>
                            <span className="text-xs text-[#86868b]">
                              {formatDate(history.created_at)}
                            </span>
                          </div>
                          <div className="ml-9 p-4 rounded-xl bg-[#f5f5f7] dark:bg-[#1d1d1f] space-y-3 relative group">
                            {isLast && (
                              <div className="absolute top-3 right-3 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedExtension(history)
                                    setSelectedExtensionIndex(index)
                                    setIsEditExtensionModalOpen(true)
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-[#2a3241] border border-[#d2d2d7] dark:border-[#424245] text-[#424245] dark:text-[#86868b] hover:text-[#0071e3] hover:border-[#0071e3] dark:hover:text-[#0071e3] dark:hover:border-[#0071e3] shadow-sm transition-all"
                                  title={language === 'tr' ? 'Düzenle' : 'Edit'}
                                >
                                  <PencilSquareIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedExtension(history)
                                    setSelectedExtensionIndex(index)
                                    setIsDeleteExtensionModalOpen(true)
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-[#2a3241] border border-[#d2d2d7] dark:border-[#424245] text-[#424245] dark:text-[#86868b] hover:text-red-600 hover:border-red-600 dark:hover:text-red-500 dark:hover:border-red-500 shadow-sm transition-all"
                                  title={language === 'tr' ? 'Sil' : 'Delete'}
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <CubeIcon className="w-4 h-4 text-[#86868b]" />
                              <span className="text-[#424245] dark:text-[#86868b]">
                                {formatPackageType(history.new_package_type)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarDaysIcon className="w-4 h-4 text-[#86868b]" />
                              <span className="text-[#424245] dark:text-[#86868b]">
                                {history.new_start_date 
                                  ? `${formatDate(history.new_start_date)} - ${formatDate(history.new_end_date)}`
                                  : `${formatDate(history.previous_end_date)} - ${formatDate(history.new_end_date)}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CreditCardIcon className="w-4 h-4 text-[#86868b]" />
                              <span className="text-[#424245] dark:text-[#86868b]">
                                {formatPaymentMethod(history.payment_method)} - {history.payment_amount} ₺
                                {history.payment_date && (
                                  <> - {formatDate(history.payment_date)}</>
                                )}
                              </span>
                            </div>
                            {history.notes && (
                              <div className="flex items-start gap-2 text-sm">
                                <PencilSquareIcon className="w-4 h-4 text-[#86868b] mt-0.5" />
                                <span className="text-[#424245] dark:text-[#86868b] italic">
                                  {history.notes}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isHistorySheetOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40"
          onClick={() => {
            setIsHistorySheetOpen(false)
            setSelectedHistoryRegistration(null)
          }}
        />
      )}

      {/* Aktifleştirme onay modalını ekliyorum */}
      <div className={`
        fixed inset-0 z-50 overflow-y-auto
        ${isActivateModalOpen ? 'block' : 'hidden'}
      `}>
        {/* Overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity" />

        {/* Modal */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#121621] p-6 shadow-xl transition-all">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsActivateModalOpen(false)
                setRegistrationToActivate(null)
              }}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Content */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <ArrowUturnUpIcon className="h-6 w-6 text-green-600 dark:text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
                    {language === 'tr' ? 'Kaydı Aktifleştir' : 'Activate Record'}
                  </h2>
                  <p className="text-[#6e6e73] dark:text-[#86868b] text-sm">
                    {language === 'tr' 
                      ? 'Bu kayıt aktif listeye taşınacak'
                      : 'This record will be moved to active list'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-[#f5f5f7] dark:bg-[#1d1d1f] p-4 space-y-3">
                  {/* Öğrenci Bilgileri */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'tr' ? 'Öğrenci:' : 'Student:'}
                    </span>
                    <span className="font-medium text-[#1d1d1f] dark:text-white">
                      {registrationToActivate?.student_name}
                    </span>
                  </div>

                  {/* Yaş Bilgisi */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'tr' ? 'Yaş:' : 'Age:'}
                    </span>
                    <span className="font-medium text-[#1d1d1f] dark:text-white">
                      {registrationToActivate?.student_age}
                    </span>
                  </div>

                  {/* Veli Bilgisi */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'tr' ? 'Veli:' : 'Parent:'}
                    </span>
                    <span className="font-medium text-[#1d1d1f] dark:text-white">
                      {registrationToActivate?.parent_name}
                    </span>
                  </div>
                </div>

                {/* Bilgi Mesajı */}
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-900/30">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {language === 'tr' 
                      ? 'Bu işlem kaydı arşivden çıkarıp aktif kayıtlar listesine taşıyacaktır.'
                      : 'This action will move the record from archive to the active records list.'}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsActivateModalOpen(false)
                    setRegistrationToActivate(null)
                  }}
                  className="flex-1 h-11 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#161616] focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                  disabled={isActivating}
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleActivate}
                  className="flex-1 h-11 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isActivating}
                >
                  {isActivating ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{language === 'tr' ? 'Aktifleştiriliyor' : 'Activating'}</span>
                    </>
                  ) : (
                    <>
                      <ArrowUturnUpIcon className="w-5 h-5" />
                      <span>{language === 'tr' ? 'Aktifleştir' : 'Activate'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 