import { useState, useEffect } from 'react';
import { Brain, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const AssistantButton = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [wasClicked, setWasClicked] = useState(false);

  // Montrer le tooltip automatiquement après le chargement de la page (seulement la première fois)
  useEffect(() => {
    if (!wasClicked) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        
        // Masquer le tooltip après 5 secondes
        const hideTimer = setTimeout(() => {
          setShowTooltip(false);
        }, 5000);
        
        return () => clearTimeout(hideTimer);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [wasClicked]);

  const handleClick = () => {
    setWasClicked(true);
    setShowTooltip(false);
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 md:bottom-8 right-4 sm:right-6 md:right-8 z-50">
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className="absolute bottom-full right-0 mb-2 bg-card p-3 rounded-lg shadow-lg border max-w-[200px] text-sm"
          >
            <button 
              className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-muted"
              onClick={() => setShowTooltip(false)}
            >
              <X className="h-3 w-3" />
            </button>
            <p>Accédez à votre assistant intelligent en un clic !</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Link to="/dashboard/assistant" onClick={handleClick}>
        <motion.div
          className="relative group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Glow effect */}
          <motion.div 
            className="absolute inset-0 rounded-full bg-primary opacity-20 blur-md"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
          
          {/* Main button */}
          <motion.button
            className="relative bg-gradient-to-r from-primary to-blue-600 text-white rounded-full p-3 sm:p-3.5 shadow-lg flex items-center justify-center border border-primary/20 backdrop-blur-sm"
            initial={{ boxShadow: "0 0 0 0 rgba(79, 70, 229, 0.4)" }}
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(79, 70, 229, 0.4)",
                "0 0 0 10px rgba(79, 70, 229, 0)",
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "loop"
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => !wasClicked && setShowTooltip(false)}
          >
            <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.button>
          
          {/* Little pulsing dot */}
          <div className="absolute top-0 right-0 h-2.5 w-2.5 sm:h-3 sm:w-3">
            <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500"></span>
          </div>
        </motion.div>
      </Link>
    </div>
  );
};

export default AssistantButton;