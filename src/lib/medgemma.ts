// MedGemma 1.5 4B Integration via Server-Side API
// Client-side library now acts as a thin wrapper around /api/analyze

import { v4 as uuidv4 } from 'uuid';
import type { 
  DocumentType, 
  ExtractedData,
  LabResult,
  LabCategory,
  MedicalDocument,
  HealthAlert 
} from '@/types/medical';

// ============================================
// MAIN FUNCTIONS
// ============================================

export async function extractDocumentData(
  imageBase64: string,
  hintType?: DocumentType
): Promise<{ 
  extractedData: ExtractedData; 
  documentType: DocumentType; 
  title: string; 
  date: string; 
  provider?: string; 
  facility?: string 
}> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'extract',
        image: imageBase64
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to extract data');
    }

    const { data } = await response.json();
    return parseExtractionData(data); // Parse and hydrate with IDs
    
  } catch (error) {
    console.error('[MedGemma] Extraction failed:', error);
    throw error;
  }
}

export async function generateExplanation(
  extractedData: ExtractedData,
  language: string = 'English'
): Promise<string> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'explain',
        data: extractedData.structuredData
      })
    });

    if (!response.ok) {
        throw new Error('Failed to generate explanation');
    }

    const { explanation } = await response.json();
    
    // If language is not English, we could add a translation step here or in the API
    // For now returning the explanation as is (which defaults to English from API)
    return explanation;

  } catch (error) {
    console.error('[MedGemma] Explanation failed:', error);
    return "Could not generate explanation at this time.";
  }
}

export async function checkMedicationInteractions(
  medications: string[]
): Promise<string> {
  if (medications.length < 2) {
    return 'Add at least 2 medications to check for interactions.';
  }
  
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'interactions',
        data: { medications }
      })
    });

    if (!response.ok) throw new Error('Failed to check interactions');

    const { result } = await response.json();
    return result;

  } catch (error) {
    console.error('[MedGemma] Interaction check failed:', error);
    return "Could not check interactions at this time.";
  }
}

export async function generateAppointmentSummary(
  documents: MedicalDocument[]
): Promise<string> {
  try {
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'summary',
            data: { documents }
        })
    });

    if (!response.ok) throw new Error('Failed to generate summary');
    
    const { summary } = await response.json();
    return summary;

  } catch (error) {
    console.error('[MedGemma] Summary generation failed:', error);
    return "Could not generate summary.";
  }
}

export function generateAlerts(document: MedicalDocument): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const labResults = document.extractedData.structuredData.labResults || [];
  
  labResults.forEach(result => {
    if (result.status === 'critical') {
      alerts.push({
        id: uuidv4(),
        type: 'critical',
        title: `Critical: ${result.testName}`,
        message: `Your ${result.testName} level of ${result.value} ${result.unit} requires immediate attention.`,
        relatedLabResult: result,
        createdAt: new Date().toISOString(),
        dismissed: false,
      });
    } else if (result.status === 'high' || result.status === 'low') {
      alerts.push({
        id: uuidv4(),
        type: 'warning',
        title: `${result.testName} ${result.status === 'high' ? 'Elevated' : 'Low'}`,
        message: `Your ${result.testName} is ${result.value} ${result.unit}, which is ${result.status === 'high' ? 'above' : 'below'} normal.`,
        relatedLabResult: result,
        createdAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  });
  
  return alerts;
}

// ============================================
// PARSING & VALIDATION
// ============================================

function parseExtractionData(parsed: any): {
  extractedData: ExtractedData;
  documentType: DocumentType;
  title: string;
  date: string;
  provider?: string;
  facility?: string;
} {
  const labResults: LabResult[] = (parsed.labResults || []).map((lab: any) => ({
    id: uuidv4(),
    testName: lab.testName || 'Unknown Test',
    value: parseLabValue(lab.value),
    unit: lab.unit || '',
    referenceRange: lab.referenceRange ? {
      low: parseFloat(lab.referenceRange.low) || undefined,
      high: parseFloat(lab.referenceRange.high) || undefined,
      text: lab.referenceRange.text || '',
    } : undefined,
    status: validateStatus(lab.status),
    category: validateCategory(lab.category),
  }));

  return {
    extractedData: {
      rawText: parsed.rawText || '',
      structuredData: {
        patientInfo: parsed.patientInfo,
        labResults,
        medications: parsed.medications || [],
        diagnoses: parsed.diagnoses || [],
        vitals: parsed.vitals || [],
        procedures: parsed.procedures || [],
        imagingFindings: parsed.imagingFindings || [],
        recommendations: parsed.recommendations || [],
      },
      confidence: 0.92,
    },
    documentType: validateDocumentType(parsed.documentType),
    title: parsed.title || 'Medical Document',
    date: parsed.date || new Date().toISOString().split('T')[0],
    provider: parsed.provider,
    facility: parsed.facility,
  };
}

function parseLabValue(value: any): number | string {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
    return value;
  }
  return String(value);
}

function validateStatus(status: string): LabResult['status'] {
  const valid = ['normal', 'low', 'high', 'critical', 'unknown'];
  return valid.includes(status) ? status as LabResult['status'] : 'unknown';
}

function validateCategory(category: string): LabCategory {
  const valid = ['metabolic', 'lipid', 'cbc', 'thyroid', 'liver', 'kidney', 'cardiac', 'inflammatory', 'vitamin', 'hormone', 'other'];
  return valid.includes(category) ? category as LabCategory : 'other';
}

function validateDocumentType(type: string): DocumentType {
  const valid = ['lab_report', 'discharge_summary', 'imaging', 'prescription', 'other'];
  return valid.includes(type) ? type as DocumentType : 'other';
}

// ============================================
// EXPORTS
// ============================================

export const LAB_CATEGORY_INFO: Record<LabCategory, { name: string; description: string; icon: string }> = {
  metabolic: { name: 'Metabolic', description: 'Blood sugar and metabolic markers', icon: '🔬' },
  lipid: { name: 'Lipid Panel', description: 'Cholesterol and fat levels', icon: '❤️' },
  cbc: { name: 'Blood Count', description: 'Red and white blood cell counts', icon: '🩸' },
  thyroid: { name: 'Thyroid', description: 'Thyroid hormone levels', icon: '🦋' },
  liver: { name: 'Liver Function', description: 'Liver enzyme levels', icon: '🫁' },
  kidney: { name: 'Kidney Function', description: 'Kidney health markers', icon: '💧' },
  cardiac: { name: 'Cardiac', description: 'Heart-related markers', icon: '💓' },
  inflammatory: { name: 'Inflammatory', description: 'Inflammation markers', icon: '🔥' },
  vitamin: { name: 'Vitamins', description: 'Vitamin levels', icon: '☀️' },
  hormone: { name: 'Hormones', description: 'Hormone levels', icon: '⚡' },
  other: { name: 'Other', description: 'Other lab tests', icon: '📊' },
};

export const SUPPORTED_LANGUAGES = [
  'English',
  'Spanish',
  'Chinese',
  'Hindi',
  'Arabic',
  'Portuguese',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Urdu',
  'Vietnamese',
];
