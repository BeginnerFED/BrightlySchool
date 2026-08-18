import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
import { XMarkIcon, ExclamationTriangleIcon, ArchiveBoxXMarkIcon, TrashIcon } from '@heroicons/react/24/outline'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// canDelete: kayıt hiç para görmemiş ve hiç ders yakmamışsa true.
// Kural veritabanında (can_delete_registration); buradaki yalnızca butonu
// göstermek için — silme işlemi de aynı kuralı tekrar kontrol ediyor.
export default function DeleteRegisterModal({ isOpen, onClose, onConfirm, onDelete, entry, isLoading, isDeleting, canDelete }) {
  const { language } = useLanguage()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#121621] p-6 shadow-xl transition-all">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Content */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <ArchiveBoxXMarkIcon className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
                  {language === 'uk' ? 'Архівувати запис' : 'Archive Record'}
                </h2>
                <p className="text-[#6e6e73] dark:text-[#86868b] text-sm">
                  {language === 'uk' 
                    ? 'Запис буде перенесено до архіву'
                    : 'This record will be moved to archive'}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-[#f5f5f7] dark:bg-[#1d1d1f] p-4 space-y-3">
                {/* Öğrenci Bilgileri */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6e6e73] dark:text-[#86868b]">
                    {language === 'uk' ? 'Дитина:' : 'Student:'}
                  </span>
                  <span className="font-medium text-[#1d1d1f] dark:text-white">
                    {entry?.student_name}
                  </span>
                </div>

                {/* Yaş Bilgisi */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6e6e73] dark:text-[#86868b]">
                    {language === 'uk' ? 'Вік:' : 'Age:'}
                  </span>
                  <span className="font-medium text-[#1d1d1f] dark:text-white">
                    {entry?.student_age}
                  </span>
                </div>

                {/* Veli Bilgisi */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6e6e73] dark:text-[#86868b]">
                    {language === 'uk' ? 'Батьки:' : 'Parent:'}
                  </span>
                  <span className="font-medium text-[#1d1d1f] dark:text-white">
                    {entry?.parent_name}
                  </span>
                </div>
              </div>

              {/* Uyarı Mesajı */}
              <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-900/30">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {language === 'uk' 
                    ? 'Після архівування запис не відображатиметься у списку активних. За потреби його можна знову активувати з архіву.'
                    : 'After archiving, the record will not appear in the active records list. You can reactivate it from the archive view when needed.'}
                </p>
              </div>

              {/* Kalıcı silme yalnızca kaybedilecek bir şey yoksa teklif
                  edilir: ödeme ve ders geçmişi CASCADE ile birlikte silinir,
                  yani geçmiş bir ayın geliri geriye dönük değişirdi.
                  Ayraç + gerçek buton: önceki hali açıklama kutusuna
                  benziyordu ve tıklanabilir olduğu anlaşılmıyordu. */}
              {canDelete && (
                <div className="pt-1">
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-[#d2d2d7] dark:bg-[#2a3241]" />
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'uk' ? 'або' : 'or'}
                    </span>
                    <span className="h-px flex-1 bg-[#d2d2d7] dark:bg-[#2a3241]" />
                  </div>

                  <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-4 mb-3 text-center">
                    {language === 'uk'
                      ? 'Цей запис не має ні оплат, ні проведених занять — його можна видалити повністю.'
                      : 'This record has no payments and no attended lessons, so it can be removed completely.'}
                  </p>

                  <button
                    type="button"
                    onClick={() => onDelete(entry)}
                    disabled={isLoading || isDeleting}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border-2 border-red-500/60 text-red-600 dark:text-red-400 font-medium hover:bg-red-600 hover:text-white hover:border-red-600 focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-600"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{language === 'uk' ? 'Видалення' : 'Deleting'}</span>
                      </>
                    ) : (
                      <>
                        <TrashIcon className="w-5 h-5" />
                        <span>{language === 'uk' ? 'Видалити назавжди' : 'Delete permanently'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#161616] focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                disabled={isLoading}
              >
                {language === 'uk' ? 'Скасувати' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => onConfirm(entry)}
                className="flex-1 h-11 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 focus:outline-none transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{language === 'uk' ? 'Архівування' : 'Archiving'}</span>
                  </>
                ) : (
                  <>
                    <ArchiveBoxXMarkIcon className="w-5 h-5" />
                    <span>{language === 'uk' ? 'В архів' : 'Archive'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 