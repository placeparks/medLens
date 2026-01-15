'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  FileText, 
  TrendingUp, 
  Bell, 
  Plus, 
  ChevronRight,
  Activity,
  Heart,
  Droplets,
  Zap,
  Calendar,
  User,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { useMedLensStore, loadDemoData, DEMO_DOCUMENTS } from '@/lib/store';
import DocumentUpload from '@/components/DocumentUpload';
import HealthDashboard from '@/components/HealthDashboard';
import DocumentTimeline from '@/components/DocumentTimeline';
import DocumentDetail from '@/components/DocumentDetail';
import AlertsPanel from '@/components/AlertsPanel';
import type { MedicalDocument } from '@/types/medical';

type View = 'dashboard' | 'upload' | 'timeline' | 'document';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<MedicalDocument | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { documents, alerts, addDocument } = useMedLensStore();
  const alertCount = alerts.filter(a => !a.dismissed).length;
  
  // Load demo data on mount
  useEffect(() => {
    // Check if we need to load demo data
    const storedDocs = useMedLensStore.getState().documents;
    if (storedDocs.length === 0) {
      DEMO_DOCUMENTS.forEach((doc) => {
        useMedLensStore.getState().addDocument(doc);
      });
    }
    setIsLoaded(true);
  }, []);
  
  const handleDocumentClick = (doc: MedicalDocument) => {
    setSelectedDocument(doc);
    setCurrentView('document');
  };
  
  const handleUploadComplete = (doc: MedicalDocument) => {
    addDocument(doc);
    setSelectedDocument(doc);
    setCurrentView('document');
  };
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'upload', label: 'Scan Document', icon: Camera },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
  ];

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
          <p className="text-midnight-500 font-medium">Loading MedLens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-cream-50/80 backdrop-blur-lg border-b border-cream-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-500 to-sage-700 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold text-midnight-900">MedLens</h1>
                <p className="text-xs text-midnight-500 -mt-0.5">Your Health Companion</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as View)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-sage-100 text-sage-700' 
                        : 'text-midnight-600 hover:bg-cream-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            
            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Alerts button */}
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative p-2 rounded-xl hover:bg-cream-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-midnight-600" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-coral-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {alertCount}
                  </span>
                )}
              </button>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-cream-100 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-midnight-600" />
                ) : (
                  <Menu className="w-5 h-5 text-midnight-600" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-cream-200 bg-cream-50"
            >
              <nav className="px-4 py-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id as View);
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all
                        ${isActive 
                          ? 'bg-sage-100 text-sage-700' 
                          : 'text-midnight-600 hover:bg-cream-100'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      {/* Alerts Panel */}
      <AnimatePresence>
        {showAlerts && (
          <AlertsPanel onClose={() => setShowAlerts(false)} />
        )}
      </AnimatePresence>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <HealthDashboard 
                onDocumentClick={handleDocumentClick}
                onUploadClick={() => setCurrentView('upload')}
              />
            </motion.div>
          )}
          
          {currentView === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DocumentUpload 
                onComplete={handleUploadComplete}
                onCancel={() => setCurrentView('dashboard')}
              />
            </motion.div>
          )}
          
          {currentView === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DocumentTimeline onDocumentClick={handleDocumentClick} />
            </motion.div>
          )}
          
          {currentView === 'document' && selectedDocument && (
            <motion.div
              key="document"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DocumentDetail 
                document={selectedDocument}
                onBack={() => setCurrentView('dashboard')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Floating Action Button (mobile) */}
      {currentView !== 'upload' && (
        <button
          onClick={() => setCurrentView('upload')}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-sage-600 text-white rounded-full shadow-elevated flex items-center justify-center hover:bg-sage-700 transition-colors z-30"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
