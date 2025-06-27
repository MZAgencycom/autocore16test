import { Link } from 'react-router-dom'
import Logo from './Logo'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    { name: 'Twitter', url: 'https://x.com/autocoreai69219' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/company/autocoreai' },
    { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61576805884916' },
    { name: 'Instagram', url: 'https://www.instagram.com/autocore.ai/' }
  ]

  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Logo and Description */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <Logo className="h-6 w-6" />
              <span className="font-bold text-xl">
                AutoCore<span className="text-primary">AI</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Plateforme d'automatisation pour carrossiers et garages, optimisez vos processus et gagnez du temps.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Liens rapides</h3>
            <ul className="space-y-2">
              {['Accueil', 'Fonctionnalités', 'Tarifs', 'Blog'].map((item) => (
                <li key={item}>
                  <Link 
                    to={item === 'Accueil' ? '/' : `/#${item.toLowerCase()}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Informations légales</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/legal/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Conditions générales
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link to="/legal/legal-notice" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link to="/legal/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="mailto:contact@autocoreai.fr" className="hover:text-primary transition-colors">
                  contact@autocoreai.fr
                </a>
              </li>
              <li>+33 (0)6 24 53 47 81</li>
              <li>180 avenue du Prado, 13008 Marseille</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <p className="text-xs text-muted-foreground">
              © {currentYear} AutoCore AI. Tous droits réservés.
            </p>
            <div className="flex space-x-6">
              {socialLinks.map(({ name, url }) => (
                <a
                  key={name}
                  href={url}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  target="_blank"
                  rel="noreferrer"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
