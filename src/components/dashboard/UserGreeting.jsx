import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const UserGreeting = () => {
  const { user } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Mettre à jour l'heure toutes les minutes
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Définir le message de salutation en fonction de l'heure
    const hours = currentDateTime.getHours();
    let newGreeting = '';

    if (hours >= 5 && hours < 12) {
      newGreeting = 'Bonjour';
    } else if (hours >= 12 && hours < 18) {
      newGreeting = 'Bon après-midi';
    } else {
      newGreeting = 'Bonsoir';
    }

    setGreeting(newGreeting);
  }, [currentDateTime]);

  // Formater la date en français
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Extraire le prénom de l'utilisateur connecté
  const firstName = user?.user_metadata?.first_name || 'utilisateur';

  return (
    <div className="mb-8">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold flex items-center">
          {greeting} <span className="text-primary ml-1">{firstName}</span>{' '}
          <span className="text-2xl ml-1">👋</span>
        </h1>
      </div>
      <p className="text-muted-foreground mt-1">
        Nous sommes le {formatDate(currentDateTime)}
      </p>
    </div>
  );
};

export default UserGreeting;