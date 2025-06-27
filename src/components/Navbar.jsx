import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Logo from './Logo'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  
  // Listen for scroll events
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Navigation items
  const navItems = [
    { name: 'Accueil', href: '/' },
    { name: 'Fonctionnalités', href: '/#features' },
    { name: 'Tarifs', href: '/#pricing' },
    { name: 'Contact', href: '/#contact' },
  ]
  
  return (
    <header 
      className={`fixed top-0 w-full z-40 transition-all duration-200 ${
        isScrolled ? 'bg-background/80 backdrop-blur-md border-b' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Logo className="h-8 w-8" />
            <span className="font-bold text-xl">
              AutoCore<span className="text-primary">AI</span>
            </span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === item.href ? 'text-primary' : 'text-foreground/80'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        
        <div className="hidden md:flex items-center space-x-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>
          
          {user ? (
            <div className="flex items-center space-x-3">
              <Link 
                to="/dashboard"
                className="btn-outline"
              >
                Dashboard
              </Link>
              <button 
                onClick={signOut}
                className="btn-secondary"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link 
                to="/login"
                className="btn-outline"
              >
                Connexion
              </Link>
              <Link 
                to="/register"
                className="btn-primary"
              >
                Essai gratuit
              </Link>
            </div>
          )}
        </div>
        
        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden space-x-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-foreground"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          className="md:hidden px-4 pt-2 pb-4 bg-background/95 backdrop-blur-sm border-b"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <nav className="flex flex-col space-y-4 py-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`px-2 py-1 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === item.href 
                    ? 'text-primary bg-primary/10' 
                    : 'text-foreground/80 hover:text-primary hover:bg-primary/5'
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-2 space-y-2">
              {user ? (
                <>
                  <Link 
                    to="/dashboard" 
                    onClick={() => setIsOpen(false)}
                    className="w-full block text-center btn-primary"
                  >
                    Dashboard
                  </Link>
                  <button 
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                    className="w-full block text-center btn-outline"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    onClick={() => setIsOpen(false)}
                    className="w-full block text-center btn-outline"
                  >
                    Connexion
                  </Link>
                  <Link 
                    to="/register" 
                    onClick={() => setIsOpen(false)}
                    className="w-full block text-center btn-primary"
                  >
                    Essai gratuit
                  </Link>
                </>
              )}
            </div>
          </nav>
        </motion.div>
      )}
    </header>
  )
}

export default Navbar