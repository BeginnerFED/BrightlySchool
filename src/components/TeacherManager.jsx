import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ShieldCheckIcon, AcademicCapIcon } from '@heroicons/react/24/outline'
import SettingCard from './ui/SettingCard'
import { TEACHER_COLOR_OPTIONS } from '../lib/teacherColors'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'

// Ayarlar > Öğretmenler. Burada HESAP AÇILMAZ — tarayıcıdan kullanıcı
// oluşturmak service role anahtarı ister ve o anahtar pakete konursa tüm
// izin sistemi geçersiz kalır. Yalnızca görünen ad ve rol düzenlenir.
//
// Rol seçimi bilinçli olarak tema seçicinin desenini kullanıyor: aynı sayfada
// iki farklı "seçim" görünümü olmasın.
export default function TeacherManager() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const isUk = language === 'uk'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  // { id, role } — onay bekleyen rol değişikliği
  const [pending, setPending] = useState(null)
  const popoverRef = useRef(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, color, created_at')
      .order('created_at')
    if (error) console.error('Profiller alınamadı:', error.message)
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Dışarı tıklayınca onay kutusu kapansın
  useEffect(() => {
    if (!pending) return
    const onDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setPending(null)
    }
    const onKey = (e) => { if (e.key === 'Escape') setPending(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pending])

  const patch = async (id, values) => {
    const { error } = await supabase.from('profiles').update(values).eq('id', id)
    if (error) return console.error('Güncellenemedi:', error.message)
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...values } : r)))
  }

  const saveName = (id) => {
    patch(id, { full_name: draft.trim() || null })
    setEditingId(null)
  }

  const confirmRole = async () => {
    if (!pending) return
    await patch(pending.id, { role: pending.role })
    setPending(null)
  }

  if (loading) {
    // Kartın kendi çerçevesini taklit eden sakin bir iskelet. Eskiden kocaman
    // boş bir kutuydu; kart görünümüne hiç benzemediği için yükleme bittiğinde
    // ekran zıplıyordu.
    return (
      <>
        {[0, 1].map(i => (
          <div
            key={i}
            className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-[#2a3241]"
          >
            <div className="h-5 w-32 rounded-md bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
            <div className="h-4 w-44 rounded-md bg-gray-100 dark:bg-[#242b3d] animate-pulse mt-5" />
            <div className="h-6 w-40 rounded-md bg-gray-100 dark:bg-[#242b3d] animate-pulse mt-5" />
            <div className="flex gap-2 mt-5">
              <div className="h-14 flex-1 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
              <div className="h-14 flex-1 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
            </div>
          </div>
        ))}
      </>
    )
  }

  const ROLES = [
    { value: 'owner', icon: ShieldCheckIcon, label: isUk ? 'Власник' : 'Owner' },
    { value: 'teacher', icon: AcademicCapIcon, label: isUk ? 'Викладач' : 'Teacher' },
  ]

  return (
    <>
      {rows.map(row => {
        const isSelf = row.id === user?.id
        const editing = editingId === row.id
        const displayName = row.full_name || row.email
        const pendingHere = pending?.id === row.id

        // Kesikli çerçeve alanın düzenlenebilir olduğunu hover beklemeden
        // gösteriyor — dokunmatikte hover yok, simge de keşfedilmiyordu.
        // Görünüm ve düzenleme kutuları aynı ölçüde, geçişte zıplama olmasın.
        const nameBoxClasses = 'w-full h-9 px-2.5 -ml-2.5 rounded-lg text-left font-medium outline-none transition-all duration-200'

        const title = editing ? (
          <input
            type="text"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => saveName(row.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName(row.id)
              if (e.key === 'Escape') setEditingId(null)
            }}
            placeholder={isUk ? 'Імʼя та прізвище' : 'Full name'}
            className={`${nameBoxClasses} bg-white dark:bg-[#121621] border border-indigo-400 dark:border-indigo-600 text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-indigo-500/25`}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setEditingId(row.id); setDraft(row.full_name || '') }}
            className={`${nameBoxClasses} border border-dashed border-gray-200 dark:border-[#2a3241] hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-[#242b3d] ${
              row.full_name ? 'text-[#1d1d1f] dark:text-white' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <span className="block truncate">
              {displayName || (isUk ? 'Без імені' : 'No name')}
            </span>
          </button>
        )

        return (
          <SettingCard key={row.id} title={title}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                {isUk ? 'Пошта' : 'Email'}
              </p>
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {row.email || '—'}
              </span>
            </div>

            {/* Takvim rengi. Ders kartları, ana sayfa rozetleri ve herkese
                açık takvim bu renkten besleniyor — yeni bir öğretmen
                eklendiğinde rengi burada verilmezse nötr gri kalır. */}
            <div className="flex items-center justify-between gap-3 mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                {isUk ? 'Колір у розкладі' : 'Calendar color'}
              </p>
              <div className="flex items-center gap-1.5">
                {TEACHER_COLOR_OPTIONS.map(color => {
                  const active = row.color === color
                  // Aynı rengi iki kişiye vermek karışıklık yaratır ama
                  // engellenmiyor: sahip bilerek eşitlemek isteyebilir.
                  const takenBy = rows.find(r => r.id !== row.id && r.color === color)
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => patch(row.id, { color })}
                      title={takenBy ? (takenBy.full_name || takenBy.email) : ''}
                      aria-label={color}
                      className={`w-6 h-6 rounded-full transition-all duration-200 ${
                        active
                          ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-[#1a1f2e]'
                          : takenBy
                            ? 'opacity-30 hover:opacity-60'
                            : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Kendi rolü kilitli: tek sahip kendini öğretmene çevirirse
                panele bir daha kimse giremez. */}
            <div className="relative mt-4">
              <div className="flex items-center justify-between">
                {ROLES.map((role, index) => {
                  const active = row.role === role.value
                  const locked = isSelf
                  const Icon = role.icon

                  return (
                    <div
                      key={role.value}
                      onClick={() => { if (!active && !locked) setPending({ id: row.id, role: role.value }) }}
                      className={`flex-1 py-2.5 px-3 ${index === 0 ? 'mr-2' : ''} rounded-lg flex flex-col items-center transition-all duration-200 ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 border-2'
                          : locked
                            ? 'bg-gray-50 dark:bg-[#242b3d] border border-gray-200 dark:border-gray-700 opacity-40'
                            : 'bg-gray-50 dark:bg-[#242b3d] border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2d364a]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1 ${
                        active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                      }`} />
                      <span className={`text-xs font-medium ${
                        active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {role.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Onay kutusu — rol değişikliği finansal veriye erişimi
                  açıp kapadığı için tek tıkla olmamalı */}
              {pendingHere && (
                <div
                  ref={popoverRef}
                  className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-gray-200 dark:border-[#2a3241] bg-white dark:bg-[#1a1f2e] shadow-lg p-3.5"
                >
                  <p className="text-sm text-[#1d1d1f] dark:text-white leading-snug">
                    {pending.role === 'owner'
                      ? (isUk
                          ? <>Надати <span className="font-medium">{displayName}</span> доступ до фінансів?</>
                          : <>Give <span className="font-medium">{displayName}</span> access to the finances?</>)
                      : (isUk
                          ? <>Забрати доступ до фінансів у <span className="font-medium">{displayName}</span>?</>
                          : <>Remove <span className="font-medium">{displayName}</span>'s access to the finances?</>)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setPending(null)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#242b3d] border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#2d364a] transition-all duration-200"
                    >
                      {isUk ? 'Скасувати' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={confirmRole}
                      className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200"
                    >
                      {isUk ? 'Підтвердити' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SettingCard>
        )
      })}
    </>
  )
}
