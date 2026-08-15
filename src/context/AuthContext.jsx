import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  // 1) Oturum. onAuthStateChange geri çağrısının İÇİNDE Supabase sorgusu
  // beklenmez — o geri çağrı auth kilidi tutulurken çalışır, içeride await
  // etmek girişte uygulamayı kilitleyebilir. Burada yalnızca state yazılır.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2) Rol, kullanıcı kimliği değişince ayrı bir effect'te çekilir.
  useEffect(() => {
    let active = true

    if (!user?.id) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error('Profil bilgisi alınamadı:', error.message)
        // Satır yoksa rol null kalır — açıkta kalmaktansa hiçbir şeye
        // erişemesin. ProtectedRoute bu durumu ayrıca ele alır.
        setProfile(data ?? null)
        setProfileLoading(false)
      })

    return () => { active = false }
  }, [user?.id])

  // Rol hazır olmadan çocuklar render edilmez: aradaki tek karede bile
  // rol null görünse rota koruması yanlış yöne yönlendirir.
  const loading = authLoading || profileLoading

  const value = {
    user,
    profile,
    loading,
    role: profile?.role ?? null,
    isOwner: profile?.role === 'owner',
    isTeacher: profile?.role === 'teacher',
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
