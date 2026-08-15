import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function DeleteExtensionModal({ isOpen, onClose, onSuccess, registration, extension, extensionIndex }) {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleDelete = async () => {
    if (!extension?.id) return
    setIsLoading(true)

    try {
      const { error } = await supabase.rpc('delete_last_extension', {
        p_extension_id: extension.id
      })

      if (error) throw error

      const successMessage = language === 'tr'
        ? 'Uzatma başarıyla silindi.'
        : 'Extension successfully deleted.'

      onSuccess?.(successMessage, 'success')
      onClose()
    } catch (error) {
      console.error('Uzatma silinirken hata:', error.message)
      const errorMessage = language === 'tr'
        ? 'Uzatma silinirken bir hata oluştu.'
        : 'An error occurred while deleting the extension.'
      onSuccess?.(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#121621] p-6 shadow-xl transition-all">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            disabled={isLoading}
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Content */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Uzatmayı Sil' : 'Delete Extension'}
              </h2>
            </div>

            <p className="text-[#6e6e73] dark:text-[#86868b] mb-4">
              {language === 'tr'
                ? 'Bu uzatmayı silmek istediğinizden emin misiniz? Kayıt uzatma öncesi durumuna geri dönecek ve finansal kayıt silinecektir. Bu işlem geri alınamaz.'
                : 'Are you sure you want to delete this extension? The registration will revert to its pre-extension state and the financial record will be removed. This action cannot be undone.'}
            </p>

            <div className="border-t border-[#d2d2d7] dark:border-[#2a3241] pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-[#6e6e73] dark:text-[#86868b]">
                <span>{language === 'tr' ? 'Öğrenci:' : 'Student:'}</span>
                <span className="font-medium text-[#1d1d1f] dark:text-white">{registration?.student_name}</span>
              </div>
              {typeof extensionIndex === 'number' && (
                <div className="flex items-center justify-between text-sm text-[#6e6e73] dark:text-[#86868b]">
                  <span>{language === 'tr' ? 'Uzatma:' : 'Extension:'}</span>
                  <span className="font-medium text-[#1d1d1f] dark:text-white">
                    {language === 'tr' ? `${extensionIndex + 1}. Uzatma` : `Extension #${extensionIndex + 1}`}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-[#6e6e73] dark:text-[#86868b]">
                <span>{language === 'tr' ? 'Tarih Aralığı:' : 'Date Range:'}</span>
                <span className="font-medium text-[#1d1d1f] dark:text-white">
                  {formatDate(extension?.new_start_date || extension?.previous_end_date)} - {formatDate(extension?.new_end_date)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#6e6e73] dark:text-[#86868b]">
                <span>{language === 'tr' ? 'Tutar:' : 'Amount:'}</span>
                <span className="font-medium text-[#1d1d1f] dark:text-white">
                  {extension?.payment_amount ?? 0} ₺
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#161616] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-[#2a2a2a] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                disabled={isLoading}
              >
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 h-11 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{language === 'tr' ? 'Siliniyor' : 'Deleting'}</span>
                  </>
                ) : (
                  language === 'tr' ? 'Sil' : 'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
