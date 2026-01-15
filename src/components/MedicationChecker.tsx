'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill,
  Plus,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Info,
} from 'lucide-react';
import { checkMedicationInteractions } from '@/lib/medgemma';

interface MedicationCheckerProps {
  initialMedications?: string[];
}

export default function MedicationChecker({ initialMedications = [] }: MedicationCheckerProps) {
  const [medications, setMedications] = useState<string[]>(initialMedications);
  const [newMed, setNewMed] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addMedication = () => {
    if (newMed.trim() && !medications.includes(newMed.trim())) {
      setMedications([...medications, newMed.trim()]);
      setNewMed('');
      setResult(null); // Clear previous results
    }
  };

  const removeMedication = (med: string) => {
    setMedications(medications.filter(m => m !== med));
    setResult(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMedication();
    }
  };

  const checkInteractions = async () => {
    if (medications.length < 2) {
      setError('Please add at least 2 medications to check for interactions.');
      return;
    }

    setIsChecking(true);
    setError(null);
    setResult(null);

    try {
      const interactionResult = await checkMedicationInteractions(medications);
      setResult(interactionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check interactions');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
          <Pill className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-midnight-900">
            Medication Interaction Checker
          </h2>
          <p className="text-sm text-midnight-500">
            Check for potential drug interactions
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMed}
            onChange={(e) => setNewMed(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter medication name..."
            className="input flex-1"
          />
          <button
            onClick={addMedication}
            disabled={!newMed.trim()}
            className="btn-primary px-4"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Medication Tags */}
        {medications.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {medications.map((med) => (
              <motion.span
                key={med}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm"
              >
                <Pill className="w-3.5 h-3.5" />
                {med}
                <button
                  onClick={() => removeMedication(med)}
                  className="hover:text-violet-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.span>
            ))}
          </div>
        )}

        {/* Info Box */}
        {medications.length < 2 && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-cream-50 border border-cream-100">
            <Info className="w-5 h-5 text-midnight-400 mt-0.5" />
            <p className="text-sm text-midnight-600">
              Add at least 2 medications to check for potential interactions.
            </p>
          </div>
        )}

        {/* Check Button */}
        <button
          onClick={checkInteractions}
          disabled={medications.length < 2 || isChecking}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing with MedGemma...
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5" />
              Check Interactions
            </>
          )}
        </button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-700 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 pt-6 border-t border-cream-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-sage-500" />
              <h3 className="font-medium text-midnight-900">Analysis Results</h3>
            </div>
            
            <div className="prose prose-sm max-w-none text-midnight-700">
              <div className="p-4 rounded-xl bg-cream-50 whitespace-pre-wrap">
                {result}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800">
                <strong>⚠️ Important:</strong> This is AI-generated information for educational purposes only. 
                Always consult your pharmacist or doctor before making any changes to your medications.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
