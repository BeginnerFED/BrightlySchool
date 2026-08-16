import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Öğrenci atanabilecek kişiler: öğretmenler VE okul sahibi.
// Sahip de ders veriyor; listeye alınmasaydı kendi öğrencisini kendine
// atayamaz, kayıt "öğretmensiz" görünürdü.
//
// profiles politikası gereği bu sorgu yalnızca sahip için dolu döner;
// öğretmen çağırırsa kendi satırından başkasını görmez. Öğretmen zaten
// yalnızca kendi derslerini gördüğü için bu yeterli: takvimdeki her dersin
// rengi kendi satırından çözülür.
//
// color kolonu takvim/rozet rengini belirler (bkz. src/lib/teacherColors.js).
export const useTeachers = (enabled = true) => {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let active = true
    setLoading(true)

    supabase
      .from('profiles')
      .select('id, full_name, email, role, color')
      .order('role')          // owner önce gelsin
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

// id -> profil eşlemesi. Renk ve ad aramaları hep bunun üzerinden yapılsın ki
// her ekran kendi eşlemesini kurmasın.
export const buildTeacherMap = (teachers) =>
  Object.fromEntries((teachers || []).map(teacher => [teacher.id, teacher]))
