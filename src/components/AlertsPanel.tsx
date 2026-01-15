'use client';

import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Bell,
} from 'lucide-react';
import { useMedLensStore } from '@/lib/store';
import type { HealthAlert } from '@/types/medical';

interface AlertsPanelProps {
  onClose: () => void;
}

export default function AlertsPanel({ onClose }: AlertsPanelProps) {
  const { alerts, dismissAlert } = useMedLensStore();
  
  const activeAlerts = alerts.filter(a => !a.dismissed);
  const dismissedAlerts = alerts.filter(a => a.dismissed);
  
  const getAlertIcon = (type: HealthAlert['type']) => {
    switch (type) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-coral-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <Info className="w-5 h-5 text-sky-500" />;
    }
  };
  
  const getAlertStyle = (type: HealthAlert['type']) => {
    switch (type) {
      case 'critical': return 'border-coral-200 bg-coral-50';
      case 'warning': return 'border-amber-200 bg-amber-50';
      case 'info': return 'border-sky-200 bg-sky-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-midnight-900/20 backdrop-blur-sm" />
      
      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-md bg-cream-50 shadow-elevated h-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-coral-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-coral-600" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-midnight-900">Health Alerts</h2>
              <p className="text-sm text-midnight-500">
                {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-cream-100 transition-colors"
          >
            <X className="w-5 h-5 text-midnight-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sage-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-sage-600" />
              </div>
              <h3 className="text-lg font-display font-semibold text-midnight-900 mb-2">
                All Clear!
              </h3>
              <p className="text-midnight-500">
                You have no active health alerts at this time.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {activeAlerts.map((alert, idx) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 rounded-xl border ${getAlertStyle(alert.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-midnight-900">{alert.title}</h4>
                        <p className="text-sm text-midnight-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-midnight-400 mt-2">
                          {format(parseISO(alert.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="p-1 rounded-lg hover:bg-white/50 transition-colors"
                      >
                        <X className="w-4 h-4 text-midnight-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
          
          {/* Dismissed alerts */}
          {dismissedAlerts.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-midnight-500 mb-3">Dismissed</h3>
              <div className="space-y-2">
                {dismissedAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-xl bg-cream-100 border border-cream-200 opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-midnight-700 text-sm">{alert.title}</h4>
                        <p className="text-xs text-midnight-500 mt-0.5">
                          {format(parseISO(alert.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-cream-200 bg-white">
          <p className="text-xs text-midnight-500 text-center">
            These alerts are for informational purposes only. Always consult with your healthcare provider.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
