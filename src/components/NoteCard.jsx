import React from 'react'
import { useLanguage } from '../context/LanguageContext'
import { 
  StarIcon as StarIconOutline,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function NoteCard({ note, onFavorite, onEdit, onDelete }) {
  const { language } = useLanguage()

  // Tarihi formatla
  const formatDate = (date) => {
    return format(new Date(date), 'dd MMM yyyy', {
      locale: language === 'tr' ? tr : undefined
    })
  }

  // İçeriği kısalt
  const truncateContent = (content, maxLength = 200) => {
    if (!content) return ''
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

  // Renk için background class'ı oluştur
  const getColorClass = (color) => {
    switch (color) {
      case '#ffffff':
        return 'bg-white dark:bg-[#121621] border-[#d2d2d7] dark:border-[#2a3241]'
      case '#f87171':
        return 'bg-[#f87171]/10 border-[#f87171]/20'
      case '#fbbf24':
        return 'bg-[#fbbf24]/10 border-[#fbbf24]/20'
      case '#34d399':
        return 'bg-[#34d399]/10 border-[#34d399]/20'
      case '#60a5fa':
        return 'bg-[#60a5fa]/10 border-[#60a5fa]/20'
      case '#a78bfa':
        return 'bg-[#a78bfa]/10 border-[#a78bfa]/20'
      default:
        return 'bg-white dark:bg-[#121621] border-[#d2d2d7] dark:border-[#2a3241]'
    }
  }

  return (
    <div 
      className={`
        group mb-6 rounded-2xl border relative overflow-hidden transition-all duration-200
        hover:shadow-lg dark:hover:shadow-[#0071e3]/10 hover:border-[#0071e3] dark:hover:border-[#0071e3]
        ${getColorClass(note.color)}
      `}
    >
      <div className="p-5">
        {/* Başlık ve Favori */}
        <div className="flex items-start justify-between mb-3 gap-4">
          <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white line-clamp-2">
            {note.title}
          </h3>
          <div className="shrink-0 w-8 h-8 -mt-1 -mr-2 rounded-lg flex items-center justify-center">
            {note.is_favorite && (
              <StarIconSolid className="w-5 h-5 text-[#0071e3]" />
            )}
          </div>
        </div>

        {/* İçerik */}
        <div className="mb-4">
          <p className="text-[#424245] dark:text-[#86868b] line-clamp-4">
            {truncateContent(note.content)}
          </p>
        </div>

        {/* Alt Bilgi */}
        <div className="flex items-center justify-between pt-4 border-t border-[#d2d2d7] dark:border-[#2a3241]">
          <span className="text-sm text-[#86868b]">
            {formatDate(note.created_at)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="h-0 group-hover:h-[45px] opacity-0 group-hover:opacity-100 border-t border-[#d2d2d7] dark:border-[#2a3241] transition-all duration-200 overflow-hidden">
        <div className="flex items-center divide-x divide-[#d2d2d7] dark:divide-[#2a3241]">
          <button
            onClick={() => onEdit(note)}
            className="flex-1 h-11 flex items-center justify-center gap-2 font-medium transition-colors text-sm text-[#424245] dark:text-[#86868b] hover:text-[#0071e3] dark:hover:text-[#0071e3] hover:bg-[#0071e3]/5 dark:hover:bg-[#0071e3]/10"
          >
            <PencilSquareIcon className="w-4 h-4" />
            <span>{language === 'tr' ? 'Düzenle' : 'Edit'}</span>
          </button>

          <button
            onClick={() => onFavorite(note)}
            className="flex-1 h-11 flex items-center justify-center gap-2 font-medium transition-colors text-sm text-[#424245] dark:text-[#86868b] hover:text-[#34c759] dark:hover:text-[#32d74b] hover:bg-[#34c759]/5 dark:hover:bg-[#32d74b]/10"
          >
            {note.is_favorite ? (
              <StarIconSolid className="w-4 h-4" />
            ) : (
              <StarIconOutline className="w-4 h-4" />
            )}
            <span>{language === 'tr' ? 'Favori' : 'Favorite'}</span>
          </button>

          <button
            onClick={() => onDelete(note)}
            className="flex-1 h-11 flex items-center justify-center gap-2 font-medium transition-colors text-sm text-[#424245] dark:text-[#86868b] hover:text-[#ef4444] dark:hover:text-[#ef4444] hover:bg-[#ef4444]/5 dark:hover:bg-[#ef4444]/10"
          >
            <TrashIcon className="w-4 h-4" />
            <span>{language === 'tr' ? 'Sil' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  )
} 