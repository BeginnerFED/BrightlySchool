import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'

// Bir dersin katılımcılarını listeler ve yoklama almayı sağlar.
//
// Bu bileşen olmadan öğretmenin yoklama alacak hiçbir yeri yoktu: statü
// yalnızca Home ve RemainingUsage sayfalarından değiştirilebiliyordu, ikisi de
// öğretmene kapalı. Ders hakkı sayacı yoklamayla işlediği için bu boşluk
// paket kullanımını da hesaplanamaz hale getiriyordu.
//
// Yetki veritabanında: öğretmen yalnızca KENDİ dersinin katılımcılarını
// güncelleyebilir (participants_staff_update politikası).
const STATUSES = [
  { value: 'attended',  uk: 'Відвідав',       en: 'Joined',  tone: 'green' },
  { value: 'no_show',   uk: 'Не зʼявився',    en: 'Absent',  tone: 'red' },
  { value: 'postponed', uk: 'Перенесено',     en: 'Delayed', tone: 'amber' },
  { value: 'makeup',    uk: 'Відпрацювання',  en: 'Makeup',  tone: 'purple' },
]

const TONE_ACTIVE = {
  green:  'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
  red:    'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
  amber:  'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
  purple: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50',
}

const TONE_HOVER = {
  green:  'hover:bg-green-50 hover:text-green-700 hover:border-green-300',
  red:    'hover:bg-red-50 hover:text-red-700 hover:border-red-300',
  amber:  'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300',
  purple: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300',
}

export default function AttendanceList({ eventId }) {
  const { language } = useLanguage()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const load = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const { data: participants, error } = await supabase
        .from('event_participants')
        .select('id, status, registration_id')
        .eq('event_id', eventId)
        .order('created_at')

      if (error) throw error

      const ids = (participants || []).map(p => p.registration_id).filter(Boolean)
      let nameById = {}

      if (ids.length > 0) {
        // my_students: öğretmen kendi derslerine katılanları, sahip herkesi görür
        const { data: students, error: studentsError } = await supabase
          .from('my_students')
          .select('id, student_name')
          .in('id', ids)

        if (studentsError) throw studentsError
        nameById = Object.fromEntries((students || []).map(s => [s.id, s.student_name]))
      }

      setRows((participants || []).map(p => ({
        ...p,
        student_name: nameById[p.registration_id] || '—'
      })))
    } catch (err) {
      console.error('Katılımcılar getirilirken hata:', err.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const setStatus = async (participant, status) => {
    setUpdatingId(participant.id)
    // Önce ekranda göster, sonra yaz — hata olursa geri al
    const previous = participant.status
    setRows(prev => prev.map(r => r.id === participant.id ? { ...r, status } : r))

    const { error } = await supabase
      .from('event_participants')
      .update({ status })
      .eq('id', participant.id)

    if (error) {
      console.error('Yoklama güncellenirken hata:', error.message)
      setRows(prev => prev.map(r => r.id === participant.id ? { ...r, status: previous } : r))
    }
    setUpdatingId(null)
  }

  if (loading) {
    // Panelin geri kalanıyla aynı dil: düz "Yükleniyor..." yazısı yerine
    // satırların yerini tutan sakin iskelet.
    return (
      <div className="space-y-2">
        {[0, 1].map(i => (
          <div key={i} className="h-11 w-full rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="text-sm text-[#6e6e73] dark:text-[#86868b] py-2">
        {language === 'uk' ? 'Учасників ще немає' : 'No participants yet'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div
          key={row.id}
          className="rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] px-4 py-3"
        >
          <div className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-2 truncate">
            {row.student_name}
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(status => (
              <button
                key={status.value}
                type="button"
                onClick={() => setStatus(row, status.value)}
                disabled={updatingId === row.id}
                className={`px-3 py-1 text-[11px] font-medium rounded-full border transition disabled:opacity-50 ${
                  row.status === status.value
                    ? TONE_ACTIVE[status.tone]
                    : `bg-white text-gray-700 border-gray-300 dark:bg-[#1c1c1e]/40 dark:text-gray-300 dark:border-gray-700 ${TONE_HOVER[status.tone]}`
                }`}
              >
                {language === 'uk' ? status.uk : status.en}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
