// Core medical data types for MedLens

export type DocumentType = 'lab_report' | 'discharge_summary' | 'imaging' | 'prescription' | 'other';

export interface MedicalDocument {
  id: string;
  type: DocumentType;
  title: string;
  date: string;
  provider?: string;
  facility?: string;
  originalImage?: string;
  extractedData: ExtractedData;
  explanation?: string;
  voiceNotes: VoiceNote[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedData {
  rawText?: string;
  structuredData: StructuredMedicalData;
  confidence: number;
}

export interface StructuredMedicalData {
  patientInfo?: PatientInfo;
  labResults?: LabResult[];
  medications?: Medication[];
  diagnoses?: Diagnosis[];
  vitals?: VitalSign[];
  procedures?: Procedure[];
  imagingFindings?: ImagingFinding[];
  recommendations?: string[];
}

export interface PatientInfo {
  name?: string;
  dateOfBirth?: string;
  gender?: string;
  mrn?: string; // Medical Record Number
}

export interface LabResult {
  id: string;
  testName: string;
  value: number | string;
  unit: string;
  referenceRange?: {
    low?: number;
    high?: number;
    text?: string;
  };
  status: 'normal' | 'low' | 'high' | 'critical' | 'unknown';
  category: LabCategory;
  loincCode?: string; // Standard medical code
  collectionDate?: string;
}

export type LabCategory = 
  | 'metabolic'
  | 'lipid'
  | 'cbc'
  | 'thyroid'
  | 'liver'
  | 'kidney'
  | 'cardiac'
  | 'inflammatory'
  | 'vitamin'
  | 'hormone'
  | 'other';

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string;
  prescriber?: string;
  instructions?: string;
}

export interface Diagnosis {
  name: string;
  icdCode?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'resolved' | 'chronic';
  diagnosedDate?: string;
}

export interface VitalSign {
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'height' | 'bmi' | 'oxygen_saturation' | 'respiratory_rate';
  value: string | number;
  unit: string;
  measuredAt?: string;
}

export interface Procedure {
  name: string;
  date?: string;
  provider?: string;
  findings?: string;
  cptCode?: string;
}

export interface ImagingFinding {
  modality: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'other';
  bodyPart: string;
  findings: string;
  impression?: string;
  date?: string;
}

export interface VoiceNote {
  id: string;
  transcript: string;
  audioUrl?: string;
  duration: number;
  createdAt: string;
}

// Timeline and tracking types
export interface TimelineEvent {
  id: string;
  documentId: string;
  date: string;
  type: DocumentType;
  title: string;
  summary: string;
  highlights?: string[];
}

export interface LabTrend {
  testName: string;
  category: LabCategory;
  unit: string;
  dataPoints: {
    date: string;
    value: number;
    status: LabResult['status'];
  }[];
  currentStatus: 'improving' | 'stable' | 'worsening' | 'unknown';
  referenceRange?: {
    low: number;
    high: number;
  };
}

export interface HealthAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  relatedLabResult?: LabResult;
  createdAt: string;
  dismissed: boolean;
}

// API types
export interface ProcessDocumentRequest {
  image: string; // Base64 encoded
  documentType?: DocumentType;
}

export interface ProcessDocumentResponse {
  document: MedicalDocument;
  alerts: HealthAlert[];
}

// Store types
export interface MedLensStore {
  documents: MedicalDocument[];
  alerts: HealthAlert[];
  isProcessing: boolean;
  
  // Actions
  addDocument: (doc: MedicalDocument) => void;
  updateDocument: (id: string, updates: Partial<MedicalDocument>) => void;
  removeDocument: (id: string) => void;
  addAlert: (alert: HealthAlert) => void;
  dismissAlert: (id: string) => void;
  setProcessing: (status: boolean) => void;
  
  // Computed
  getLabTrends: () => LabTrend[];
  getTimeline: () => TimelineEvent[];
}
