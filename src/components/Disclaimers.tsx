'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, Info } from 'lucide-react';

// Legal disclaimers for compliance
export const DISCLAIMERS = {
  general: `MedLens is a personal health information organizer designed to help you understand and track your medical documents. It is NOT a medical device and should NOT be used for diagnosis, treatment decisions, or as a substitute for professional medical advice.`,
  
  aiLimitations: `This app uses artificial intelligence to extract and interpret medical document data. AI can make errors. Always verify extracted information against your original documents and consult healthcare professionals for medical decisions.`,
  
  notMedicalAdvice: `Information provided by MedLens is for educational purposes only. It does not constitute medical advice, diagnosis, or treatment recommendations. Always consult qualified healthcare providers for medical concerns.`,
  
  dataPrivacy: `Your health information is stored locally on your device. We do not store your medical data on our servers. You are responsible for the security of your device and data.`,
  
  medicationWarning: `Medication information is for reference only. Drug interactions shown may be incomplete or inaccurate. ALWAYS consult your pharmacist or doctor before making medication decisions.`,
  
  emergencyWarning: `If you are experiencing a medical emergency, call 911 or your local emergency services immediately. Do not rely on this app for emergency medical guidance.`,
};

// First-time user consent modal
export function ConsentModal({ onAccept }: { onAccept: () => void }) {
  const [hasRead, setHasRead] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-cream-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-midnight-900">
                Important Information
              </h2>
              <p className="text-sm text-midnight-500">Please read before continuing</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 mb-1">Not a Medical Device</h3>
                <p className="text-sm text-amber-700">{DISCLAIMERS.general}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-cream-50 border border-cream-200">
            <h3 className="font-medium text-midnight-800 mb-2">AI Limitations</h3>
            <p className="text-sm text-midnight-600">{DISCLAIMERS.aiLimitations}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-cream-50 border border-cream-200">
            <h3 className="font-medium text-midnight-800 mb-2">Your Privacy</h3>
            <p className="text-sm text-midnight-600">{DISCLAIMERS.dataPrivacy}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">Emergency Warning</h3>
                <p className="text-sm text-red-700">{DISCLAIMERS.emergencyWarning}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-cream-100 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasRead}
              onChange={(e) => setHasRead(e.target.checked)}
              className="mt-1 rounded border-cream-300 text-sage-600 focus:ring-sage-500"
            />
            <span className="text-sm text-midnight-600">
              I understand that MedLens is not a medical device, AI can make errors, 
              and I will consult healthcare professionals for medical decisions.
            </span>
          </label>
          
          <button
            onClick={onAccept}
            disabled={!hasRead}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            I Understand, Continue
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Inline disclaimer banner
export function DisclaimerBanner({ type = 'general' }: { type?: keyof typeof DISCLAIMERS }) {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;
  
  return (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
      <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-700 flex-1">{DISCLAIMERS[type]}</p>
      <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-800">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Footer disclaimer
export function FooterDisclaimer() {
  return (
    <div className="mt-8 pt-6 border-t border-cream-100 text-center">
      <p className="text-xs text-midnight-400 max-w-2xl mx-auto">
        {DISCLAIMERS.notMedicalAdvice}
      </p>
      <p className="text-xs text-midnight-300 mt-2">
        © {new Date().getFullYear()} MedLens • For educational purposes only
      </p>
    </div>
  );
}

// Hook to check consent
export function useConsent() {
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  
  useEffect(() => {
    const consent = localStorage.getItem('medlens-consent');
    setHasConsented(consent === 'true');
  }, []);
  
  const giveConsent = () => {
    localStorage.setItem('medlens-consent', 'true');
    localStorage.setItem('medlens-consent-date', new Date().toISOString());
    setHasConsented(true);
  };
  
  return { hasConsented, giveConsent };
}
