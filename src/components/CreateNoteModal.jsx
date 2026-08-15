import React, { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { 
  XMarkIcon,
  StarIcon,
  DocumentTextIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

export default function CreateNoteModal({ isOpen, onClose, onSuccess }) {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    color: '#ffffff',
    is_favorite: false
  })

  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        content: '',
        color: '#ffffff',
        is_favorite: false
      })
    }
  }, [isOpen])

  // Form gönderme
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid()) return

    setIsLoading(true)
    try {
      await onSuccess(formData)
      onClose() // Başarılı durumda modalı kapat
    } catch (error) {
      console.error('Not oluşturulurken hata:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Form validasyonu
  const isFormValid = () => {
    return formData.title.trim() !== '' && formData.content.trim() !== ''
  }

  // Renk seçenekleri
  const colorOptions = [
    '#ffffff', // Beyaz
    '#f87171', // Kırmızı
    '#fbbf24', // Sarı
    '#34d399', // Yeşil
    '#60a5fa', // Mavi
    '#a78bfa'  // Mor
  ]

  // Renk için background class'ı oluştur
  const getColorClass = (color) => {
    switch (color) {
      case '#ffffff':
        return 'bg-white dark:bg-[#1d1d1f]'
      case '#f87171':
        return 'bg-[#f87171]'
      case '#fbbf24':
        return 'bg-[#fbbf24]'
      case '#34d399':
        return 'bg-[#34d399]'
      case '#60a5fa':
        return 'bg-[#60a5fa]'
      case '#a78bfa':
        return 'bg-[#a78bfa]'
      default:
        return 'bg-white dark:bg-[#1d1d1f]'
    }
  }

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${!isOpen ? 'hidden' : ''}`}>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-[#121621] shadow-xl transition-all">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[#d2d2d7] dark:border-[#2a3241]">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#0071e3]/10 dark:bg-[#0071e3]/20 rounded-full flex items-center justify-center shrink-0">
                  <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#0071e3]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-semibold text-[#1d1d1f] dark:text-white">
                    {language === 'tr' ? 'Yeni Not' : 'New Note'}
                  </h2>
                  <p className="text-sm sm:text-base text-[#6e6e73] dark:text-[#86868b]">
                    {language === 'tr' ? 'Yeni bir not oluştur' : 'Create a new note'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Başlık */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                  {language === 'tr' ? 'Başlık' : 'Title'}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full h-[45px] sm:h-[50px] px-4 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm sm:text-base"
                  placeholder={language === 'tr' ? 'Not başlığı...' : 'Note title...'}
                />
              </div>

              {/* İçerik */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                  {language === 'tr' ? 'İçerik' : 'Content'}
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full h-32 sm:h-48 px-4 py-3 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all resize-none text-sm sm:text-base"
                  placeholder={language === 'tr' ? 'Not içeriği...' : 'Note content...'}
                />
              </div>

              {/* Alt Seçenekler */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                {/* Renk Seçimi */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm font-medium text-[#1d1d1f] dark:text-white shrink-0">
                    {language === 'tr' ? 'Renk:' : 'Color:'}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`
                          w-8 h-8 sm:w-6 sm:h-6 rounded-lg transition-all
                          ${getColorClass(color)}
                          ${formData.color === color 
                            ? 'ring-2 ring-[#0071e3] ring-offset-2 ring-offset-white dark:ring-offset-[#121621]' 
                            : 'ring-1 ring-[#d2d2d7] dark:ring-[#2a3241]'
                          }
                        `}
                      />
                    ))}
                  </div>
                </div>

                {/* Favori Toggle */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_favorite: !prev.is_favorite }))}
                  className={`
                    flex items-center gap-2 px-3 h-8 rounded-lg transition-colors w-full sm:w-auto justify-center sm:justify-start
                    ${formData.is_favorite
                      ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3]'
                      : 'bg-white dark:bg-[#121621] text-[#86868b] hover:text-[#0071e3] border border-[#d2d2d7] dark:border-[#2a3241]'
                    }
                  `}
                >
                  {formData.is_favorite ? (
                    <StarIconSolid className="w-4 h-4" />
                  ) : (
                    <StarIcon className="w-4 h-4" />
                  )}
                  <span className="text-sm">
                    {language === 'tr' ? 'Favorilere Ekle' : 'Add to Favorites'}
                  </span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-[#d2d2d7] dark:border-[#2a3241]">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 sm:h-10 px-6 sm:px-4 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="h-11 sm:h-10 px-6 sm:px-4 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px] text-sm sm:text-base"
                  disabled={!isFormValid() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{language === 'tr' ? 'Oluşturuluyor' : 'Creating'}</span>
                    </>
                  ) : (
                    <>
                      <PencilSquareIcon className="w-4 h-4" />
                      <span>{language === 'tr' ? 'Oluştur' : 'Create'}</span>
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