import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Öğrenci atamak için öğretmen listesi.
// profiles politikası gereği bu sorgu yalnızca sahip için dolu döner;
// öğretmen çağırırsa kendi satırından başkasını görmez.
export const useTeachers = (enabled = true) => {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let active = true
    setLoading(true)

    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'teacher')
      .order('full_name')
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error('Öğretmen listesi alınamadı:', error.message)
        setTeachers(data || [])
        setLoading(false)
      })

    return () => { active = false }
  }, [enabled])

  return { teachers, loading }
}
