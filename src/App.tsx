import { AuthProvider, useAuth } from '@/context/AuthContext'
import { DataProvider } from '@/context/DataContext'
import { UiProvider } from '@/context/UiContext'
import { Shell } from '@/components/Shell'
import { Login } from '@/pages/Login'

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { ready, email } = useAuth()
  if (!ready) return <div className="login-screen" />
  if (!email) return <Login />
  return (
    <UiProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </UiProvider>
  )
}
