import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Users,
  FileText,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  ChevronDown,
  MessageSquare,
  ScrollText,
  Coins,
  Car,
  AlertCircle,
  FileSignature,
  FileCheck,
  Brain,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserGreeting from '../components/dashboard/UserGreeting';
import DynamicStats from '../components/dashboard/DynamicStats';
import ActivityChart from '../components/dashboard/ActivityChart';
import InvoiceStatusChart from '../components/dashboard/InvoiceStatusChart';
import RecentInvoices from '../components/dashboard/RecentInvoices';
import ScheduledReminders from '../components/dashboard/ScheduledReminders';
import SupportWidget from '../components/dashboard/SupportWidget';
import SubscriptionQuotaWidget from '../components/subscription/SubscriptionQuotaWidget';
import { RemindersProvider } from '../components/reminders/RemindersContext';
import { checkActionPermission } from '../lib/subscriptionManager';
import SubscriptionLimitModal from '../components/subscription/SubscriptionLimitModal';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { toast } from 'react-hot-toast';
import LoadingFallback from '../components/LoadingFallback';

// Page components - lazy loaded
const ClientsListPage = lazy(() => import('../components/clients/ClientList.jsx'));
const ClientDetail = lazy(() => import('../components/clients/ClientDetail.jsx'));
const AddClientForm = lazy(() => import('../components/clients/AddClientForm.jsx'));
const ReportsPage = lazy(() => import('./reports/ReportsPage.jsx'));
const ReportDetail = lazy(() => import('../components/reports/ReportDetail.jsx'));

// Invoice pages
const InvoicesListPage = lazy(() => import('./invoices/InvoicesListPage.jsx'));
const InvoiceDetail = lazy(() => import('./invoices/InvoiceDetail.jsx'));
const InvoiceCreator = lazy(() => import('../components/invoices/InvoiceCreator.jsx'));
const InvoiceEditor = lazy(() => import('../components/invoices/InvoiceEditor.jsx'));

// Loan vehicles
const LoanVehiclesPage = lazy(() => import('./loan-vehicles/LoanVehiclesPage.jsx'));
const AddLoanVehiclePage = lazy(() => import('./loan-vehicles/AddLoanVehiclePage.jsx'));
const LoanVehicleDetailPage = lazy(() => import('./loan-vehicles/LoanVehicleDetailPage.jsx'));
const VehicleLoansPage = lazy(() => import('./loan-vehicles/VehicleLoansPage.jsx'));
const LoanDetailPage = lazy(() => import('./loan-vehicles/LoanDetailPage.jsx'));
const EndLoanPage = lazy(() => import('./loan-vehicles/EndLoanPage.jsx'));
const VehicleDamageForm = lazy(() => import('./loan-vehicles/VehicleDamageForm.jsx'));
const CreateLoanPage = lazy(() => import('./loan-vehicles/CreateLoanPage.jsx'));
const TrafficViolationsPage = lazy(() => import('./loan-vehicles/TrafficViolationsPage.jsx'));
const AddTrafficViolationPage = lazy(() => import('./loan-vehicles/AddTrafficViolationPage.jsx'));
const TrafficViolationDetail = lazy(() => import('./loan-vehicles/TrafficViolationDetail.jsx'));

// Email and communication
const EmailSender = lazy(() => import('../components/communication/EmailSender.jsx'));
const CreateCessionCreancePage = lazy(() => import('./cessions/CreateCessionCreancePage.jsx'));
const CessionCreanceDetailPage = lazy(() => import('./cessions/CessionCreanceDetailPage.jsx'));
const CessionsListPage = lazy(() => import('./cessions/CessionsListPage.jsx'));

// Account pages
const AccountPage = lazy(() => import('./AccountPage.jsx'));
const AssistantPage = lazy(() => import('./AssistantPage.jsx'));
const HelpCenter = lazy(() => import('../components/help/HelpCenter.jsx'));
const RemindersPage = lazy(() => import('./RemindersPage.jsx'));
const ExpensesListPage = lazy(() => import('./expenses/ExpensesListPage.jsx'));
const ExpenseDetailPage = lazy(() => import('./expenses/ExpenseDetailPage.jsx'));
const CreateExpensePage = lazy(() => import('./expenses/CreateExpensePage.jsx'));
const ExpensesStatsPage = lazy(() => import('./expenses/ExpensesStatsPage.jsx'));
const ExpensesComingSoon = lazy(() => import('./expenses/ExpensesComingSoon.jsx'));

const DashboardPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  
  // Mobile menu state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // For subscription checks
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const sidebarRef = useRef(null);
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (import.meta?.env?.DEV) console.log('useEffect triggered: close sidebar on outside click');
    function handleClickOutside(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (import.meta?.env?.DEV) console.log('useEffect triggered: close sidebar on route change');
    setIsSidebarOpen(false);
  }, [location]);

  // Extract user's first name
  useEffect(() => {
    if (import.meta?.env?.DEV) console.log('useEffect triggered: extract first name');
    if (user && user.user_metadata) {
      setFirstName(user.user_metadata.first_name || '');
    }
  }, [user]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Generate the current module name based on the URL
  const getCurrentModule = () => {
    const path = location.pathname;
    if (path.includes('/clients')) return 'clients';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/invoices')) return 'invoices';
    if (path.includes('/loans/create')) return 'create-loan';
    if (path.includes('/violations')) return 'violations';
    if (path.includes('/loan-vehicles') || (path.includes('/loans') && !path.includes('/loans/create'))) return 'loan-vehicles';
    if (path.includes('/cessions')) return 'cessions';
    if (path.includes('/emails')) return 'communications';
    if (path.includes('/assistant')) return 'assistant';
    if (path.includes('/help')) return 'help';
    if (path.includes('/reminders')) return 'reminders';
    if (path.includes('/account')) return 'account';
    if (path.includes('/expenses')) return 'expenses';
    return 'dashboard';
  };
  
  const currentModule = getCurrentModule();
  
  const sidebar = [
    { name: 'Tableau de bord', href: '/dashboard', icon: Home, module: 'dashboard' },
    { name: 'Clients', href: '/dashboard/clients', icon: Users, module: 'clients' },
    { name: 'Rapports d\'expertise', href: '/dashboard/reports', icon: FileText, module: 'reports' },
    { name: 'Factures', href: '/dashboard/invoices', icon: ScrollText, module: 'invoices' },
    { name: 'Véhicules de prêt', href: '/dashboard/loan-vehicles', icon: Car, module: 'loan-vehicles' },
    { name: 'Créer un prêt', href: '/dashboard/loans/create', icon: FileSignature, module: 'create-loan' },
    { name: 'PV & Infractions', href: '/dashboard/violations', icon: AlertCircle, module: 'violations' },
    { name: 'Cession de créance', href: '/dashboard/cessions', icon: FileCheck, module: 'cessions' },
    { name: 'Communication', href: '/dashboard/emails', icon: MessageSquare, module: 'communications' },
    { name: 'Dépenses', href: '/dashboard/expenses', icon: Coins, module: 'expenses', comingSoon: !config.enableExpenses },
    { name: 'Rappels', href: '/dashboard/reminders', icon: Calendar, module: 'reminders' },
    { name: 'Assistant', href: '/dashboard/assistant', icon: Brain, module: 'assistant' },
    { name: 'Statistiques', href: '/dashboard/statistics', icon: BarChart2, module: 'statistics' },
    { name: 'Aide', href: '/dashboard/help', icon: HelpCircle, module: 'help' }
  ];
  
  const secondarySidebar = [
    { name: 'Paramètres du compte', href: '/dashboard/account', icon: Settings, module: 'account' },
    { name: 'Déconnexion', onClick: handleSignOut, icon: LogOut }
  ];
  
  // Format user display name
  const formatUserName = () => {
    if (user?.user_metadata) {
      const firstName = user.user_metadata.first_name || '';
      const lastName = user.user_metadata.last_name || '';
      return `${firstName} ${lastName}`;
    }
    return user?.email || 'Utilisateur';
  };
  
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Subscription Limit Modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        reason={limitInfo?.reason}
        details={limitInfo?.details}
        upgradePriceId={limitInfo?.upgrade}
      />
      
      {/* Mobile header */}
      <div className="md:hidden bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-muted/50 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-2">
          <span className="font-semibold">AutoCore<span className="text-primary">AI</span></span>
        </div>
        <div className="relative">
          <button 
            onClick={toggleDropdown}
            className="flex items-center space-x-1 p-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <ChevronDown className="h-4 w-4" />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card border rounded-md shadow-lg z-10">
              <div className="p-3 border-b">
                <p className="font-medium">{formatUserName()}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="p-2">
                <Link 
                  to="/dashboard/account"
                  className="flex items-center px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres
                </Link>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Sidebar for mobile - overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      
      <div className="flex h-[calc(100vh-57px)] md:h-screen">
        {/* Sidebar */}
        <div
          ref={sidebarRef}
          className={`fixed md:sticky top-0 h-full bg-card border-r z-50 transition-all duration-300 ${
            isSidebarOpen ? 'left-0 w-64' : '-left-64 w-64 md:left-0 md:w-20 xl:w-64'
          }`}
        >
          <div className={`p-4 border-b flex ${isSidebarOpen ? 'justify-between' : 'justify-center md:justify-between'}`}>
            <div className={`flex items-center ${!isSidebarOpen && 'md:hidden xl:flex'}`}>
              <span className="font-bold text-xl">
                AutoCore<span className="text-primary">AI</span>
              </span>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-md hover:bg-muted transition-colors md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-2 flex flex-col h-[calc(100%-120px)] overflow-y-auto">
            {sidebar.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={(e) => {
                  if (item.comingSoon) {
                    e.preventDefault();
                    toast('\uD83D\uDD27 Ce module sera bientôt disponible. Nous travaillons activement à son développement pour améliorer encore votre gestion. Merci de votre patience !');
                  }
                }}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                  currentModule === item.module
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted/50'
                } ${!isSidebarOpen && 'md:justify-center md:px-2 xl:px-3 xl:justify-start'}`}
              >
                <item.icon className={`h-5 w-5 ${currentModule === item.module ? '' : 'text-muted-foreground'}`} />
                <span className={`${!isSidebarOpen && 'md:hidden xl:inline'}`}>{item.name}</span>
                {!isSidebarOpen && item.badge && (
                  <span className="md:hidden xl:inline-block px-2 py-1 text-xs rounded-full bg-primary/20 text-primary">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-2 border-t bg-card">
            {secondarySidebar.map((item) => (
              item.onClick ? (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors hover:bg-muted/50 ${
                    !isSidebarOpen && 'md:justify-center md:px-2 xl:px-3 xl:justify-start'
                  }`}
                >
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className={`${!isSidebarOpen && 'md:hidden xl:inline'}`}>{item.name}</span>
                </button>
              ) : (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    currentModule === item.module 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted/50'
                  } ${!isSidebarOpen && 'md:justify-center md:px-2 xl:px-3 xl:justify-start'}`}
                >
                  <item.icon className={`h-5 w-5 ${currentModule === item.module ? '' : 'text-muted-foreground'}`} />
                  <span className={`${!isSidebarOpen && 'md:hidden xl:inline'}`}>{item.name}</span>
                </Link>
              )
            ))}
          </div>
        </div>
        
        {/* Main content */}
        <main className="flex-1 min-w-0 h-[calc(100vh-57px)] md:h-screen overflow-y-auto">
          {/* Desktop header */}
          <div className="hidden md:flex bg-card border-b px-6 py-3 items-center justify-between sticky top-0 z-10">
            <div>
              {/* Empty div to keep the header layout balanced */}
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-md hover:bg-muted/50 transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <div className="relative">
                <button 
                  onClick={toggleDropdown}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="font-medium">{formatUserName()}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-card border rounded-md shadow-lg z-10">
                    <div className="p-3 border-b md:hidden">
                      <p className="font-medium">{formatUserName()}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link 
                        to="/dashboard/account"
                        className="flex items-center px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Paramètres
                      </Link>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <RemindersProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route index element={<DashboardContent />} />
                <Route path="clients" element={<ClientsListPage />} />
                <Route path="clients/:clientId" element={<ClientDetail />} />
                <Route path="clients/add" element={<AddClientForm />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/:reportId" element={<ReportDetail />} />
                <Route path="invoices" element={<InvoicesListPage />} />
                <Route path="invoices/:invoiceId" element={<InvoiceDetail />} />
                <Route path="invoices/create" element={<InvoiceCreator />} />
                <Route path="invoices/edit/:invoiceId" element={<InvoiceEditor />} />
                <Route path="loan-vehicles" element={<LoanVehiclesPage />} />
                <Route path="loan-vehicles/add" element={<AddLoanVehiclePage />} />
                <Route path="loan-vehicles/:id" element={<LoanVehicleDetailPage />} />
                <Route path="loan-vehicles/:id/edit" element={<AddLoanVehiclePage />} />
                <Route path="loan-vehicles/:id/damages/add" element={<VehicleDamageForm />} />
                <Route path="loans" element={<VehicleLoansPage />} />
                <Route path="loans/:id" element={<LoanDetailPage />} />
                <Route path="loans/create" element={<CreateLoanPage />} />
                <Route path="loans/:id/return" element={<EndLoanPage />} />
                <Route path="violations" element={<TrafficViolationsPage />} />
                <Route path="violations/:id" element={<TrafficViolationDetail />} />
                <Route path="violations/add" element={<AddTrafficViolationPage />} />
                <Route path="emails" element={<EmailSender />} />
                <Route path="cessions" element={<CessionsListPage />} />
                <Route path="cessions/:id" element={<CessionCreanceDetailPage />} />
                <Route path="cessions/create" element={<CreateCessionCreancePage />} />
                <Route path="assistant" element={<AssistantPage />} />
                <Route path="account/*" element={<AccountPage />} />
                <Route path="help" element={<HelpCenter />} />
                <Route path="reminders" element={<RemindersPage />} />
                <Route
                  path="expenses"
                  element={config.enableExpenses ? <ExpensesListPage /> : <ExpensesComingSoon />}
                />
                <Route
                  path="expenses/stats"
                  element={config.enableExpenses ? <ExpensesStatsPage /> : <ExpensesComingSoon />}
                />
                <Route
                  path="expenses/:id"
                  element={config.enableExpenses ? <ExpenseDetailPage /> : <ExpensesComingSoon />}
                />
                <Route
                  path="expenses/create"
                  element={config.enableExpenses ? <CreateExpensePage /> : <ExpensesComingSoon />}
                />
                <Route path="*" element={<Navigate to="/dashboard\" replace />} />
              </Routes>
            </Suspense>
          </RemindersProvider>
        </main>
      </div>
    </div>
  );
};

// Dashboard home content
const DashboardContent = () => {
  // State for refresh status on charts
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [periodFilter, setPeriodFilter] = useState('month');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);
  const [profileInfo, setProfileInfo] = useState(null);
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  
  // Get the user's company info to show alerts if incomplete
  useEffect(() => {
    if (import.meta?.env?.DEV) console.log('useEffect triggered: check company profile');
    const checkProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!error && data) {
          setProfileInfo(data);
          
          // Check if important profile fields are missing
          if (!data.company_name || !data.address_street || !data.address_city) {
            setShowProfileAlert(true);
          }
        }
      } catch (err) {
        console.error('Error checking profile:', err);
      }
    };
    
    checkProfile();
  }, []);
  
  const refreshStats = () => {
    setLastUpdated(new Date());
  };
  
  const handleStatusUpdate = () => {
    refreshStats();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Subscription Limit Modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        reason={limitInfo?.reason}
        details={limitInfo?.details}
        upgradePriceId={limitInfo?.upgrade}
      />
      
      {/* Profile completion alert */}
      {showProfileAlert && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium">Complétez votre profil</h3>
            <p className="text-sm mt-1 mb-3">
              Des informations importantes sont manquantes dans votre profil professionnel. Ces informations apparaîtront sur vos factures et sont essentielles pour votre comptabilité.
            </p>
            <Link to="/dashboard/account" className="text-primary text-sm hover:underline inline-flex items-center">
              Compléter mon profil <ChevronDown className="h-4 w-4 ml-1 rotate-270" />
            </Link>
          </div>
        </div>
      )}
      
      <UserGreeting />
      
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-9 space-y-6">
          <DynamicStats refreshKey={lastUpdated} />

          <div className="flex justify-center md:justify-start">
            <Link
              to="/dashboard/reports#upload"
              className="btn-gradient flex items-center space-x-2 w-full md:w-auto justify-center"
            >
              <FileText className="h-4 w-4" />
              <span>Analyser un rapport</span>
            </Link>
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <div className="bg-card rounded-lg border p-6 md:col-span-2">
              <h3 className="font-medium mb-4">Activité récente</h3>
              <ActivityChart period={periodFilter} refreshKey={lastUpdated} />
            </div>
            
            <div className="bg-card rounded-lg border p-6">
              <InvoiceStatusChart refreshKey={lastUpdated} />
            </div>
          </div>
          
          <RecentInvoices onStatusUpdate={handleStatusUpdate} />
        </div>
        
        <div className="md:col-span-3 space-y-6">
          <SubscriptionQuotaWidget />
          <ScheduledReminders />
          <SupportWidget />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;