import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
import Masonry from 'react-masonry-css'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Toast from '../components/ui/Toast'
import NoteCard from '../components/NoteCard'
import CreateNoteModal from '../components/CreateNoteModal'
import EditNoteModal from '../components/EditNoteModal'
import DeleteNotesModal from '../components/DeleteNotesModal'

// Supabase istemcisini oluştur
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function Notes() {
  const { language } = useLanguage()
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [filters, setFilters] = useState({
    showFavorites: false,
    color: '',
    sortBy: 'newest' // newest veya oldest
  })
  const [toast, setToast] = useState({
    message: '',
    type: 'success',
    isVisible: false
  })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState(null)

  // Notları getir
  const fetchNotes = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('notes')
        .select('*')
        
      // Favori filtresi
      if (filters.showFavorites) {
        query = query.eq('is_favorite', true)
      }

      // Renk filtresi
      if (filters.color) {
        query = query.eq('color', filters.color)
      }

      // Sıralama
      query = query.order('created_at', { ascending: filters.sortBy === 'oldest' })

      const { data, error } = await query

      if (error) throw error
      setNotes(data)
    } catch (error) {
      console.error('Notlar getirilirken hata:', error.message)
      showToast(
        language === 'tr'
          ? 'Notlar getirilirken bir hata oluştu.'
          : 'An error occurred while fetching notes.',
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Sayfa yüklendiğinde ve filtreler değiştiğinde notları getir
  useEffect(() => {
    fetchNotes()
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

  // Filtrelenmiş notları al
  const filteredNotes = notes.filter(note => {
    const searchLower = searchTerm.toLowerCase()
    return (
      note.title?.toLowerCase().includes(searchLower) ||
      note.content?.toLowerCase().includes(searchLower)
    )
  })

  // Not favorileme
  const handleFavorite = async (note) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_favorite: !note.is_favorite })
        .eq('id', note.id)

      if (error) throw error

      // Notları güncelle
      setNotes(notes.map(n => 
        n.id === note.id ? { ...n, is_favorite: !n.is_favorite } : n
      ))

      showToast(
        language === 'tr'
          ? `Not ${!note.is_favorite ? 'favorilere eklendi' : 'favorilerden çıkarıldı'}`
          : `Note ${!note.is_favorite ? 'added to' : 'removed from'} favorites`
      )
    } catch (error) {
      console.error('Not favorilerken hata:', error.message)
      showToast(
        language === 'tr'
          ? 'Not favorilerken bir hata oluştu'
          : 'An error occurred while updating favorite status',
        'error'
      )
    }
  }

  // Not silme modalını aç
  const handleDelete = (note) => {
    setNoteToDelete(note)
    setIsDeleteModalOpen(true)
  }

  // Not silme işlemini gerçekleştir
  const handleConfirmDelete = async (note) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id)

      if (error) throw error

      // Notları güncelle
      setNotes(notes.filter(n => n.id !== note.id))

      showToast(
        language === 'tr'
          ? 'Not başarıyla silindi'
          : 'Note deleted successfully'
      )
    } catch (error) {
      console.error('Not silinirken hata:', error.message)
      showToast(
        language === 'tr'
          ? 'Not silinirken bir hata oluştu'
          : 'An error occurred while deleting the note',
        'error'
      )
    }
  }

  // Not düzenleme
  const handleEdit = (note) => {
    setSelectedNote(note)
    setIsEditModalOpen(true)
  }

  // Not güncelleme
  const handleUpdate = async (formData) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: formData.title.trim(),
          content: formData.content.trim(),
          color: formData.color,
          is_favorite: formData.is_favorite
        })
        .eq('id', formData.id)

      if (error) throw error

      // Notları güncelle
      setNotes(notes.map(note => 
        note.id === formData.id ? { ...note, ...formData } : note
      ))

      showToast(
        language === 'tr'
          ? 'Not başarıyla güncellendi'
          : 'Note updated successfully'
      )
    } catch (error) {
      console.error('Not güncellenirken hata:', error.message)
      showToast(
        language === 'tr'
          ? 'Not güncellenirken bir hata oluştu'
          : 'An error occurred while updating the note',
        'error'
      )
      throw error
    }
  }

  // Not oluşturma
  const handleCreate = async (formData) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          title: formData.title.trim(),
          content: formData.content.trim(),
          color: formData.color,
          is_favorite: formData.is_favorite
        }])
        .select()

      if (error) throw error

      // Notları güncelle
      setNotes([data[0], ...notes])

      showToast(
        language === 'tr'
          ? 'Not başarıyla oluşturuldu'
          : 'Note created successfully'
      )
    } catch (error) {
      console.error('Not oluşturulurken hata:', error.message)
      showToast(
        language === 'tr'
          ? 'Not oluşturulurken bir hata oluştu'
          : 'An error occurred while creating the note',
        'error'
      )
      throw error
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] py-4 sm:py-0 gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium text-[#1d1d1f] dark:text-white">
            {language === 'tr' ? 'Notlar' : 'Notes'}
            <span className="ml-2 text-sm font-normal text-[#6e6e73] dark:text-[#86868b]">
              ({filteredNotes.length})
            </span>
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          {/* Arama */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              type="text"
              placeholder={language === 'tr' ? 'Notlarda ara...' : 'Search notes...'}
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
            {(filters.showFavorites || filters.color || filters.sortBy !== 'newest') && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#0071e3] rounded-full ring-2 ring-white dark:ring-[#121621]" />
            )}
          </button>

          {/* Yeni Not Butonu */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 sm:h-8 px-4 bg-[#1d1d1f] dark:bg-[#0071e3] text-white text-sm font-medium rounded-lg hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{language === 'tr' ? 'Yeni Not' : 'New Note'}</span>
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
                  {/* Başlık Skeleton */}
                  <div className="h-5 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg w-3/4 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                  </div>

                  {/* İçerik Skeleton */}
                  <div className="space-y-2">
                    <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-full relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                    <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-2/3 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                  </div>

                  {/* Alt Bilgi Skeleton */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#d2d2d7] dark:border-[#2a3241]">
                    <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                    <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-8 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Masonry>
        ) : filteredNotes.length === 0 ? (
          // Boş State
          <div className="text-center py-12">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
            <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
              {language === 'tr' ? 'Not Bulunamadı' : 'No Notes Found'}
            </h3>
            <p className="text-sm text-[#6e6e73] dark:text-[#86868b]">
              {searchTerm 
                ? (language === 'tr' ? 'Arama kriterlerinize uygun not bulunamadı.' : 'No notes match your search criteria.')
                : (language === 'tr' ? 'Henüz not eklenmemiş.' : 'No notes have been added yet.')}
            </p>
          </div>
        ) : (
          // Not Kartları
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
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onFavorite={handleFavorite}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
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
            {/* Favoriler Toggle */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Favoriler' : 'Favorites'}
              </h3>
              <button
                onClick={() => setFilters(prev => ({ ...prev, showFavorites: !prev.showFavorites }))}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors"
              >
                <span className="text-sm">
                  {language === 'tr' ? 'Sadece favorileri göster' : 'Show only favorites'}
                </span>
                <div className={`
                  w-10 h-6 rounded-full transition-colors relative
                  ${filters.showFavorites ? 'bg-[#1d1d1f] dark:bg-[#0071e3]' : 'bg-[#d2d2d7] dark:bg-[#424245]'}
                `}>
                  <div className={`
                    w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform
                    ${filters.showFavorites ? 'translate-x-4' : 'translate-x-0.5'}
                  `} />
                </div>
              </button>
            </div>

            {/* Sıralama */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Sıralama' : 'Sort By'}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: 'newest' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors
                    ${filters.sortBy === 'newest'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'En Yeni' : 'Newest'}
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: 'oldest' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors
                    ${filters.sortBy === 'oldest'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'En Eski' : 'Oldest'}
                </button>
              </div>
            </div>

            {/* Renk Filtresi */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Renk' : 'Color'}
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {[
                  { value: '#ffffff', label: language === 'tr' ? 'Beyaz' : 'White', class: 'bg-white dark:bg-[#1d1d1f]' },
                  { value: '#f87171', label: language === 'tr' ? 'Kırmızı' : 'Red', class: 'bg-[#f87171]' },
                  { value: '#fbbf24', label: language === 'tr' ? 'Sarı' : 'Yellow', class: 'bg-[#fbbf24]' },
                  { value: '#34d399', label: language === 'tr' ? 'Yeşil' : 'Green', class: 'bg-[#34d399]' },
                  { value: '#60a5fa', label: language === 'tr' ? 'Mavi' : 'Blue', class: 'bg-[#60a5fa]' },
                  { value: '#a78bfa', label: language === 'tr' ? 'Mor' : 'Purple', class: 'bg-[#a78bfa]' }
                ].map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setFilters(prev => ({ ...prev, color: prev.color === color.value ? '' : color.value }))}
                    className={`
                      group relative w-9 h-9 rounded-xl transition-all
                      ${color.class}
                      ${filters.color === color.value 
                        ? 'ring-2 ring-[#0071e3] ring-offset-2 ring-offset-white dark:ring-offset-[#121621]' 
                        : 'ring-1 ring-[#d2d2d7] dark:ring-[#2a3241] hover:ring-[#0071e3] dark:hover:ring-[#0071e3]'
                      }
                    `}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-[#007AFF] text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg dark:shadow-[#007AFF]/20">
                      {color.label}
                    </div>
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
                  setFilters({ showFavorites: false, color: '', sortBy: 'newest' })
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

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />

      {/* Create Modal */}
      <CreateNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreate}
      />

      {/* Edit Modal */}
      <EditNoteModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedNote(null)
        }}
        onSuccess={handleUpdate}
        note={selectedNote}
      />

      {/* Delete Confirmation Modal */}
      <DeleteNotesModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setNoteToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        note={noteToDelete}
      />
    </div>
  )
} 