// MedLens State Management with Zustand

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  MedicalDocument, 
  HealthAlert, 
  LabTrend, 
  TimelineEvent,
  LabResult,
  LabCategory 
} from '@/types/medical';

interface MedLensState {
  // Data
  documents: MedicalDocument[];
  alerts: HealthAlert[];
  isProcessing: boolean;
  processingProgress: number;
  
  // Actions
  addDocument: (doc: MedicalDocument) => void;
  updateDocument: (id: string, updates: Partial<MedicalDocument>) => void;
  removeDocument: (id: string) => void;
  addAlert: (alert: HealthAlert) => void;
  addAlerts: (alerts: HealthAlert[]) => void;
  dismissAlert: (id: string) => void;
  setProcessing: (status: boolean) => void;
  setProcessingProgress: (progress: number) => void;
  
  // Computed getters
  getLabTrends: () => LabTrend[];
  getTimeline: () => TimelineEvent[];
  getAlertCount: () => number;
  getDocumentsByType: (type: MedicalDocument['type']) => MedicalDocument[];
}

export const useMedLensStore = create<MedLensState>()(
  persist(
    (set, get) => ({
      // Initial state
      documents: [],
      alerts: [],
      isProcessing: false,
      processingProgress: 0,
      
      // Actions
      addDocument: (doc) => set((state) => ({
        documents: [doc, ...state.documents],
      })),
      
      updateDocument: (id, updates) => set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, ...updates, updatedAt: new Date().toISOString() } : doc
        ),
      })),
      
      removeDocument: (id) => set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
      })),
      
      addAlert: (alert) => set((state) => ({
        alerts: [alert, ...state.alerts],
      })),
      
      addAlerts: (alerts) => set((state) => ({
        alerts: [...alerts, ...state.alerts],
      })),
      
      dismissAlert: (id) => set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === id ? { ...alert, dismissed: true } : alert
        ),
      })),
      
      setProcessing: (status) => set({ isProcessing: status }),
      
      setProcessingProgress: (progress) => set({ processingProgress: progress }),
      
      // Computed getters
      getLabTrends: () => {
        const { documents } = get();
        const labResultsByTest: Map<string, { result: LabResult; date: string }[]> = new Map();
        
        // Collect all lab results grouped by test name
        documents.forEach((doc) => {
          const labResults = doc.extractedData.structuredData.labResults || [];
          labResults.forEach((result) => {
            const key = result.testName.toLowerCase();
            const existing = labResultsByTest.get(key) || [];
            existing.push({ result, date: doc.date });
            labResultsByTest.set(key, existing);
          });
        });
        
        // Build trends for tests with multiple data points
        const trends: LabTrend[] = [];
        
        labResultsByTest.forEach((results, testName) => {
          if (results.length >= 1) {
            // Sort by date
            results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const firstResult = results[0].result;
            const dataPoints = results
              .map(({ result, date }) => ({
                date,
                value: typeof result.value === 'number' ? result.value : parseFloat(String(result.value)) || 0,
                status: result.status,
              }))
              .filter((dp) => !isNaN(dp.value));
            
            if (dataPoints.length > 0) {
              // Determine trend direction
              let currentStatus: LabTrend['currentStatus'] = 'unknown';
              if (dataPoints.length >= 2) {
                const recent = dataPoints[dataPoints.length - 1];
                const previous = dataPoints[dataPoints.length - 2];
                const diff = recent.value - previous.value;
                const threshold = Math.abs(previous.value * 0.05); // 5% change threshold
                
                if (Math.abs(diff) <= threshold) {
                  currentStatus = 'stable';
                } else if (recent.status === 'normal' && previous.status !== 'normal') {
                  currentStatus = 'improving';
                } else if (recent.status !== 'normal' && previous.status === 'normal') {
                  currentStatus = 'worsening';
                } else if (diff > 0 && firstResult.status === 'high') {
                  currentStatus = 'worsening';
                } else if (diff < 0 && firstResult.status === 'low') {
                  currentStatus = 'worsening';
                } else {
                  currentStatus = 'stable';
                }
              }
              
              trends.push({
                testName: firstResult.testName,
                category: firstResult.category,
                unit: firstResult.unit,
                dataPoints,
                currentStatus,
                referenceRange: firstResult.referenceRange ? {
                  low: firstResult.referenceRange.low || 0,
                  high: firstResult.referenceRange.high || 100,
                } : undefined,
              });
            }
          }
        });
        
        return trends;
      },
      
      getTimeline: () => {
        const { documents } = get();
        
        return documents
          .map((doc) => {
            const labResults = doc.extractedData.structuredData.labResults || [];
            const abnormalCount = labResults.filter((r) => r.status !== 'normal').length;
            
            let summary = '';
            let highlights: string[] = [];
            
            switch (doc.type) {
              case 'lab_report':
                summary = `${labResults.length} tests performed`;
                if (abnormalCount > 0) {
                  summary += `, ${abnormalCount} abnormal`;
                }
                highlights = labResults
                  .filter((r) => r.status !== 'normal')
                  .slice(0, 3)
                  .map((r) => `${r.testName}: ${r.value} ${r.unit}`);
                break;
              case 'imaging':
                const findings = doc.extractedData.structuredData.imagingFindings || [];
                summary = findings.length > 0 ? findings[0].impression || 'Imaging study' : 'Imaging study';
                break;
              case 'prescription':
                const meds = doc.extractedData.structuredData.medications || [];
                summary = `${meds.length} medication(s) prescribed`;
                highlights = meds.slice(0, 3).map((m) => m.name);
                break;
              default:
                summary = doc.title;
            }
            
            return {
              id: doc.id,
              documentId: doc.id,
              date: doc.date,
              type: doc.type,
              title: doc.title,
              summary,
              highlights,
            };
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },
      
      getAlertCount: () => {
        const { alerts } = get();
        return alerts.filter((a) => !a.dismissed).length;
      },
      
      getDocumentsByType: (type) => {
        const { documents } = get();
        return documents.filter((doc) => doc.type === type);
      },
    }),
    {
      name: 'medlens-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        documents: state.documents,
        alerts: state.alerts,
      }),
    }
  )
);

// Demo data for initial state
export const DEMO_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'demo-1',
    type: 'lab_report',
    title: 'Annual Physical - Lab Results',
    date: '2025-12-15',
    provider: 'Dr. Sarah Chen',
    facility: 'HealthFirst Medical Center',
    extractedData: {
      structuredData: {
        labResults: [
          { id: 'l1', testName: 'Glucose, Fasting', value: 102, unit: 'mg/dL', status: 'high', category: 'metabolic', referenceRange: { low: 70, high: 100, text: '70-100 mg/dL' } },
          { id: 'l2', testName: 'Hemoglobin A1c', value: 5.8, unit: '%', status: 'high', category: 'metabolic', referenceRange: { low: 4, high: 5.6, text: '<5.7%' } },
          { id: 'l3', testName: 'Total Cholesterol', value: 210, unit: 'mg/dL', status: 'high', category: 'lipid', referenceRange: { low: 0, high: 200, text: '<200 mg/dL' } },
          { id: 'l4', testName: 'LDL Cholesterol', value: 135, unit: 'mg/dL', status: 'high', category: 'lipid', referenceRange: { low: 0, high: 100, text: '<100 mg/dL' } },
          { id: 'l5', testName: 'HDL Cholesterol', value: 48, unit: 'mg/dL', status: 'normal', category: 'lipid', referenceRange: { low: 40, high: 999, text: '>40 mg/dL' } },
          { id: 'l6', testName: 'Creatinine', value: 0.95, unit: 'mg/dL', status: 'normal', category: 'kidney', referenceRange: { low: 0.7, high: 1.3, text: '0.7-1.3 mg/dL' } },
        ],
      },
      confidence: 0.94,
    },
    voiceNotes: [],
    createdAt: '2025-12-15T10:30:00Z',
    updatedAt: '2025-12-15T10:30:00Z',
  },
  {
    id: 'demo-2',
    type: 'lab_report',
    title: 'Follow-up Labs - Metabolic Panel',
    date: '2025-09-20',
    provider: 'Dr. Sarah Chen',
    facility: 'HealthFirst Medical Center',
    extractedData: {
      structuredData: {
        labResults: [
          { id: 'l7', testName: 'Glucose, Fasting', value: 95, unit: 'mg/dL', status: 'normal', category: 'metabolic', referenceRange: { low: 70, high: 100, text: '70-100 mg/dL' } },
          { id: 'l8', testName: 'Hemoglobin A1c', value: 5.5, unit: '%', status: 'normal', category: 'metabolic', referenceRange: { low: 4, high: 5.6, text: '<5.7%' } },
          { id: 'l9', testName: 'Total Cholesterol', value: 198, unit: 'mg/dL', status: 'normal', category: 'lipid', referenceRange: { low: 0, high: 200, text: '<200 mg/dL' } },
          { id: 'l10', testName: 'LDL Cholesterol', value: 118, unit: 'mg/dL', status: 'high', category: 'lipid', referenceRange: { low: 0, high: 100, text: '<100 mg/dL' } },
        ],
      },
      confidence: 0.92,
    },
    voiceNotes: [],
    createdAt: '2025-09-20T14:15:00Z',
    updatedAt: '2025-09-20T14:15:00Z',
  },
  {
    id: 'demo-3',
    type: 'lab_report',
    title: 'Quarterly Check - Lipid Panel',
    date: '2025-06-10',
    provider: 'Dr. Sarah Chen',
    facility: 'HealthFirst Medical Center',
    extractedData: {
      structuredData: {
        labResults: [
          { id: 'l11', testName: 'Glucose, Fasting', value: 108, unit: 'mg/dL', status: 'high', category: 'metabolic', referenceRange: { low: 70, high: 100, text: '70-100 mg/dL' } },
          { id: 'l12', testName: 'Hemoglobin A1c', value: 6.0, unit: '%', status: 'high', category: 'metabolic', referenceRange: { low: 4, high: 5.6, text: '<5.7%' } },
          { id: 'l13', testName: 'Total Cholesterol', value: 225, unit: 'mg/dL', status: 'high', category: 'lipid', referenceRange: { low: 0, high: 200, text: '<200 mg/dL' } },
          { id: 'l14', testName: 'LDL Cholesterol', value: 145, unit: 'mg/dL', status: 'high', category: 'lipid', referenceRange: { low: 0, high: 100, text: '<100 mg/dL' } },
        ],
      },
      confidence: 0.91,
    },
    voiceNotes: [],
    createdAt: '2025-06-10T09:00:00Z',
    updatedAt: '2025-06-10T09:00:00Z',
  },
];

export function loadDemoData() {
  const store = useMedLensStore.getState();
  if (store.documents.length === 0) {
    DEMO_DOCUMENTS.forEach((doc) => store.addDocument(doc));
  }
}
