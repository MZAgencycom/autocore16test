import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, CreditCard, Receipt, Bell, Shield, Key, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserSettings from '../components/settings/UserSettings';
import AccountSubscription from '../components/AccountSubscription';
import AccountBilling from '../components/AccountBilling';

const AccountPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  
  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard },
    { id: 'billing', label: 'Facturation', icon: Receipt },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'api', label: 'Clés API', icon: Key },
  ];
  
  return (
    <div className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Mon compte</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-12">
        {/* Sidebar */}
        <div className="md:col-span-3">
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-medium">Paramètres</h2>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'hover:bg-muted/50 text-foreground/80'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        
        {/* Main content */}
        <div className="md:col-span-9 space-y-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'profile' && <UserSettings />}
            {activeTab === 'subscription' && <AccountSubscription />}
            {activeTab === 'billing' && <AccountBilling />}
            {activeTab === 'notifications' && (
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded bg-primary/10 text-primary mr-3">
                    <Bell className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium text-lg">Notifications</h3>
                </div>
                
                <p className="text-muted-foreground">
                  Cette fonctionnalité sera bientôt disponible.
                </p>
              </div>
            )}
            {activeTab === 'security' && (
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded bg-primary/10 text-primary mr-3">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium text-lg">Sécurité</h3>
                </div>
                
                <p className="text-muted-foreground">
                  Cette fonctionnalité sera bientôt disponible.
                </p>
              </div>
            )}
            {activeTab === 'api' && (
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded bg-primary/10 text-primary mr-3">
                    <Key className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium text-lg">Clés API</h3>
                </div>
                
                <p className="text-muted-foreground">
                  Cette fonctionnalité sera bientôt disponible.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;