import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

const Layout = () => {
  const location = useLocation()
  if (!location) return null
  const isDashboard = location.pathname.startsWith('/dashboard')
  
  if (isDashboard) {
    return <Outlet />
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout
