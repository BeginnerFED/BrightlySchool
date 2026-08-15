import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// requireOwner: yalnızca sahibin girebileceği sayfalar için.
// Menüyü gizlemek yetmez — kullanıcı adresi doğrudan yazabilir.
// (Veri koruması yine de RLS'te; bu sadece boş/kırık ekran göstermemek için.)
export default function ProtectedRoute({ children, requireOwner = false }) {
  const { user, isOwner } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireOwner && !isOwner) {
    return <Navigate to="/calendar" replace />
  }

  return children
}
