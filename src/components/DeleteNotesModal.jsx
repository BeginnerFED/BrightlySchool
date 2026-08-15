import React from 'react'
import { useLanguage } from '../context/LanguageContext'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function DeleteNotesModal({ isOpen, onClose, onConfirm, note }) {
  const { language } = useLanguage()

  const handleConfirm = () => {
    onConfirm(note)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#121621] p-6 shadow-xl transition-all">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Content */}
          <div className="text-center">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
              <div className="w-10 h-10 bg-red-500/10 dark:bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Notu Sil' : 'Delete Note'}
              </h2>
            </div>
            <p className="text-[#424245] dark:text-[#86868b] mb-6">
              {language === 'tr' 
                ? 'Bu notu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
                : 'Are you sure you want to delete this note? This action cannot be undone.'
              }
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98]"
              >
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-10 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98]"
              >
                {language === 'tr' ? 'Sil' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 