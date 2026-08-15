import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

// Supabase istemcisini oluştur
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function DeleteExpensesModal({ isOpen, onClose, expense, onDelete }) {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id)

      if (deleteError) throw deleteError

      onDelete()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#121621] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#f5f5f7] dark:border-[#2a3241]">
            <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
              {language === 'tr' ? 'Gider Sil' : 'Delete Expense'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="text-base font-medium text-[#1d1d1f] dark:text-white mb-1">
                  {language === 'tr' ? 'Emin misiniz?' : 'Are you sure?'}
                </h3>
                <p className="text-sm text-[#424245] dark:text-[#86868b]">
                  {language === 'tr' 
                    ? `"${expense?.title}" giderini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
                    : `Are you sure you want to delete the expense "${expense?.title}"? This action cannot be undone.`
                  }
                </p>
              </div>
            </div>

            {/* Hata Mesajı */}
            {error && (
              <div className="mt-4 text-sm text-red-500">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f5f5f7] dark:border-[#2a3241]">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none transition-colors"
            >
              {language === 'tr' ? 'İptal' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="h-10 px-4 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{language === 'tr' ? 'Siliniyor...' : 'Deleting...'}</span>
                  </div>
                </>
              ) : (
                language === 'tr' ? 'Sil' : 'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 