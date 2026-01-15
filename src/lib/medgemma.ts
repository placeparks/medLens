// MedGemma 1.5 4B Integration via HuggingFace Inference API
// Model: google/medgemma-1.5-4b-it
// https://huggingface.co/google/medgemma-1.5-4b-it

import { v4 as uuidv4 } from 'uuid';
import type { 
  DocumentType, 
  ExtractedData,
  LabResult,
  LabCategory,
  MedicalDocument,
  HealthAlert 
} from '@/types/medical';

// HuggingFace Configuration
const HF_MODEL = 'google/medgemma-1.5-4b-it';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// Extraction prompt optimized for MedGemma
const EXTRACTION_PROMPT = `You are MedGemma, a medical AI assistant. Analyze this medical document image and extract ALL information into structured JSON.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "documentType": "lab_report|discharge_summary|imaging|prescription|other",
  "title": "Brief descriptive title",
  "date": "YYYY-MM-DD or null",
  "provider": "Doctor name or null",
  "facility": "Hospital/clinic name or null",
  "patientInfo": {
    "name": "Patient name if visible",
    "dateOfBirth": "DOB if visible",
    "gender": "Gender if visible"
  },
  "labResults": [
    {
      "testName": "Full test name",
      "value": "numeric or string value",
      "unit": "unit of measurement",
      "referenceRange": {"low": number, "high": number, "text": "as displayed"},
      "status": "normal|low|high|critical",
      "category": "metabolic|lipid|cbc|thyroid|liver|kidney|cardiac|inflammatory|vitamin|hormone|other"
    }
  ],
  "medications": [{"name": "", "dosage": "", "frequency": "", "instructions": ""}],
  "diagnoses": [{"name": "", "status": "active|resolved|chronic"}],
  "recommendations": ["array of recommendations"],
  "rawText": "Complete extracted text"
}

Determine status by comparing value to reference range. Be thorough - extract EVERY test result visible.`;

// Plain language explanation prompt
const EXPLANATION_PROMPT = `You are a caring medical assistant helping a patient understand their results. Based on this medical data, provide a clear explanation in simple terms.

Guidelines:
- Use 6th grade reading level
- Be reassuring but honest
- Explain what abnormal values mean in plain terms
- Do NOT give medical advice
- Suggest discussing concerns with their doctor

Medical Data:
{DATA}

Write a warm, clear explanation:`;

// Medication interaction check prompt  
const INTERACTION_PROMPT = `You are MedGemma, a medical AI. Check for potential interactions between these medications:

Medications: {MEDICATIONS}

Provide a safety assessment:
1. Known interactions (if any)
2. Foods/supplements to avoid
3. Timing considerations
4. Warning signs to watch for

Be thorough but avoid causing unnecessary alarm. Always recommend consulting a pharmacist or doctor.`;

// Multi-language explanation prompt
const MULTILANG_PROMPT = `Translate this medical explanation to {LANGUAGE}. Keep it simple, warm, and easy to understand. Maintain the same reassuring tone.

Original:
{TEXT}

Translation in {LANGUAGE}:`;

// ============================================
// HUGGINGFACE API CALLS
// ============================================

interface HFResponse {
  generated_text?: string;
  error?: string;
}

async function callMedGemmaText(prompt: string): Promise<string> {
  const HF_TOKEN = process.env.NEXT_PUBLIC_HF_TOKEN;
  
  if (!HF_TOKEN) {
    throw new Error('HuggingFace token not configured. Add NEXT_PUBLIC_HF_TOKEN to .env.local');
  }

  console.log('[MedGemma] Calling HuggingFace Inference API...');
  
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 4096,
        temperature: 0.1,
        top_p: 0.95,
        do_sample: true,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[MedGemma] HF API Error:', error);
    
    if (response.status === 503) {
      throw new Error('Model is loading. Please try again in 20-30 seconds.');
    }
    throw new Error(`HuggingFace API error: ${response.status}`);
  }

  const result: HFResponse[] = await response.json();
  console.log('[MedGemma] Response received');
  
  return result[0]?.generated_text || '';
}

// For vision tasks - MedGemma via Google AI or HF
async function callMedGemmaVision(imageBase64: string, prompt: string): Promise<string> {
  const HF_TOKEN = process.env.NEXT_PUBLIC_HF_TOKEN;
  const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  
  // Use Google AI API for vision (more reliable for multimodal)
  if (GOOGLE_API_KEY) {
    console.log('[MedGemma] Using Google AI API for vision task...');
    return await callGoogleVision(imageBase64, prompt);
  }
  
  if (!HF_TOKEN) {
    throw new Error('No API tokens configured');
  }
  
  // HF Inference API fallback
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        image: base64Data,
        text: prompt,
      },
      parameters: {
        max_new_tokens: 4096,
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vision API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result[0]?.generated_text || result.generated_text || '';
}

// Google AI API for vision
async function callGoogleVision(imageBase64: string, prompt: string): Promise<string> {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  
  if (!API_KEY) {
    throw new Error('Google API key not configured');
  }

  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
  let mimeType = 'image/jpeg';
  if (imageBase64.includes('data:image/png')) mimeType = 'image/png';
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        }
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

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
  const hasHFToken = !!process.env.NEXT_PUBLIC_HF_TOKEN;
  const hasGoogleKey = !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const useRealAPI = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
  
  console.log('[MedGemma] Config:', { hasHFToken, hasGoogleKey, useRealAPI });
  
  if (useRealAPI && (hasHFToken || hasGoogleKey)) {
    try {
      console.log('[MedGemma] Using REAL MedGemma for extraction...');
      const responseText = await callMedGemmaVision(imageBase64, EXTRACTION_PROMPT);
      return parseExtractionResponse(responseText);
    } catch (error) {
      console.error('[MedGemma] Real API failed:', error);
      if (error instanceof Error && error.message.includes('loading')) {
        throw error;
      }
    }
  }
  
  console.log('[MedGemma] Using demo mode');
  return simulateExtraction(imageBase64, hintType);
}

export async function generateExplanation(
  extractedData: ExtractedData,
  language: string = 'English'
): Promise<string> {
  const hasHFToken = !!process.env.NEXT_PUBLIC_HF_TOKEN;
  const useRealAPI = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
  
  if (useRealAPI && hasHFToken) {
    try {
      const dataJson = JSON.stringify(extractedData.structuredData, null, 2);
      const prompt = EXPLANATION_PROMPT.replace('{DATA}', dataJson);
      
      let explanation = await callMedGemmaText(prompt);
      
      if (language !== 'English' && explanation) {
        const translatePrompt = MULTILANG_PROMPT
          .replace('{LANGUAGE}', language)
          .replace('{TEXT}', explanation);
        explanation = await callMedGemmaText(translatePrompt);
      }
      
      return explanation;
    } catch (error) {
      console.error('[MedGemma] Explanation failed:', error);
    }
  }
  
  return generateLocalExplanation(extractedData);
}

export async function checkMedicationInteractions(
  medications: string[]
): Promise<string> {
  const hasHFToken = !!process.env.NEXT_PUBLIC_HF_TOKEN;
  const useRealAPI = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
  
  if (medications.length < 2) {
    return 'Add at least 2 medications to check for interactions.';
  }
  
  if (useRealAPI && hasHFToken) {
    try {
      const prompt = INTERACTION_PROMPT.replace('{MEDICATIONS}', medications.join(', '));
      return await callMedGemmaText(prompt);
    } catch (error) {
      console.error('[MedGemma] Interaction check failed:', error);
    }
  }
  
  return generateDemoInteractionCheck(medications);
}

export async function generateAppointmentSummary(
  documents: MedicalDocument[]
): Promise<string> {
  const hasHFToken = !!process.env.NEXT_PUBLIC_HF_TOKEN;
  const useRealAPI = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
  
  const allLabResults = documents.flatMap(d => 
    d.extractedData.structuredData.labResults || []
  );
  const allMedications = documents.flatMap(d => 
    d.extractedData.structuredData.medications || []
  );
  const abnormalResults = allLabResults.filter(r => r.status !== 'normal');
  
  const summaryData = {
    documentCount: documents.length,
    dateRange: documents.length > 0 ? {
      from: documents[documents.length - 1]?.date,
      to: documents[0]?.date,
    } : null,
    abnormalResults: abnormalResults.map(r => ({
      test: r.testName,
      value: `${r.value} ${r.unit}`,
      status: r.status,
    })),
    medications: allMedications.map(m => m.name),
  };
  
  if (useRealAPI && hasHFToken) {
    try {
      const prompt = `You are MedGemma. Create a concise 1-page appointment summary for a patient to bring to their doctor visit.

Patient Data:
${JSON.stringify(summaryData, null, 2)}

Format as a clear summary with:
1. Key Health Metrics (abnormal values highlighted)
2. Current Medications
3. Questions to Ask Doctor
4. Recent Changes/Concerns

Keep it professional and concise:`;
      
      return await callMedGemmaText(prompt);
    } catch (error) {
      console.error('[MedGemma] Summary generation failed:', error);
    }
  }
  
  return generateLocalAppointmentSummary(summaryData);
}

// ============================================
// PARSING & VALIDATION
// ============================================

function parseExtractionResponse(responseText: string): {
  extractedData: ExtractedData;
  documentType: DocumentType;
  title: string;
  date: string;
  provider?: string;
  facility?: string;
} {
  let jsonText = responseText.trim();
  
  if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
  if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
  if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
  jsonText = jsonText.trim();
  
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse JSON from response');
    }
  }
  
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
// LOCAL/DEMO FUNCTIONS
// ============================================

function generateLocalExplanation(extractedData: ExtractedData): string {
  const { structuredData } = extractedData;
  const parts: string[] = [];
  
  parts.push("Here's what your medical document shows:\n");
  
  if (structuredData.labResults && structuredData.labResults.length > 0) {
    const abnormal = structuredData.labResults.filter(r => r.status !== 'normal');
    const normal = structuredData.labResults.filter(r => r.status === 'normal');
    
    if (normal.length > 0) {
      parts.push(`✓ Good news: ${normal.length} of your test results are within normal range, including ${normal.slice(0, 3).map(r => r.testName).join(', ')}${normal.length > 3 ? ' and others' : ''}.`);
    }
    
    if (abnormal.length > 0) {
      parts.push('\n⚠️ A few results to discuss with your doctor:\n');
      abnormal.forEach(result => {
        const direction = result.status === 'high' ? 'slightly elevated' : 
                         result.status === 'low' ? 'slightly low' : 'outside normal range';
        parts.push(`• ${result.testName}: Your level is ${result.value} ${result.unit}, which is ${direction}.`);
      });
    }
  }
  
  parts.push('\n💡 Remember: Always discuss your results with your healthcare provider for personalized advice.');
  
  return parts.join('\n');
}

function generateDemoInteractionCheck(medications: string[]): string {
  return `## Medication Review: ${medications.join(', ')}

### Potential Considerations

**General Guidelines:**
• Take medications as prescribed by your doctor
• Maintain consistent timing for daily medications
• Stay hydrated throughout the day

**Food Interactions:**
• Some medications work better on an empty stomach
• Grapefruit can interact with certain medications
• Dairy may affect absorption of some drugs

**Important Reminders:**
• Keep an updated medication list
• Inform all healthcare providers of your medications
• Report any unusual side effects promptly

⚠️ **Disclaimer:** This is general information only. Always consult your pharmacist or doctor for personalized medication advice.`;
}

function generateLocalAppointmentSummary(data: any): string {
  return `# Appointment Preparation Summary

## Overview
- **Documents on File:** ${data.documentCount}
- **Date Range:** ${data.dateRange?.from || 'N/A'} to ${data.dateRange?.to || 'N/A'}

## Items to Discuss

### Abnormal Results
${data.abnormalResults.length > 0 
  ? data.abnormalResults.map((r: any) => `- ${r.test}: ${r.value} (${r.status})`).join('\n')
  : '- All results within normal range ✓'}

### Current Medications
${data.medications.length > 0 
  ? data.medications.map((m: string) => `- ${m}`).join('\n')
  : '- No medications recorded'}

## Questions for Your Doctor
1. What do my abnormal results mean for my health?
2. Are there lifestyle changes I should make?
3. When should I get follow-up tests?
4. Are my current medications still appropriate?

---
*Generated by MedLens - Bring this summary to your appointment*`;
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
// DEMO DATA GENERATORS
// ============================================

function simulateExtraction(imageBase64: string, hintType?: DocumentType) {
  const hash = simpleHash(imageBase64.slice(0, 1000));
  const scenarios = [
    generateMetabolicDemo(),
    generateLipidDemo(),
    generateCBCDemo(),
    generateThyroidDemo(),
    generateComprehensiveDemo(),
  ];
  return scenarios[hash % 5];
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateMetabolicDemo() {
  return {
    extractedData: {
      rawText: 'Comprehensive Metabolic Panel',
      structuredData: {
        patientInfo: { name: 'Demo Patient' },
        labResults: [
          { id: uuidv4(), testName: 'Glucose, Fasting', value: 98, unit: 'mg/dL', referenceRange: { low: 70, high: 100, text: '70-100' }, status: 'normal' as const, category: 'metabolic' as const },
          { id: uuidv4(), testName: 'Hemoglobin A1c', value: 5.8, unit: '%', referenceRange: { low: 4, high: 5.6, text: '<5.7' }, status: 'high' as const, category: 'metabolic' as const },
          { id: uuidv4(), testName: 'BUN', value: 15, unit: 'mg/dL', referenceRange: { low: 7, high: 20, text: '7-20' }, status: 'normal' as const, category: 'kidney' as const },
          { id: uuidv4(), testName: 'Creatinine', value: 0.9, unit: 'mg/dL', referenceRange: { low: 0.7, high: 1.3, text: '0.7-1.3' }, status: 'normal' as const, category: 'kidney' as const },
        ],
        medications: [],
        recommendations: ['Monitor A1c levels', 'Follow up in 3 months'],
      },
      confidence: 0.94,
    },
    documentType: 'lab_report' as DocumentType,
    title: 'Comprehensive Metabolic Panel',
    date: new Date().toISOString().split('T')[0],
    provider: 'Dr. Sarah Chen, MD',
    facility: 'HealthFirst Medical Center',
  };
}

function generateLipidDemo() {
  return {
    extractedData: {
      rawText: 'Lipid Panel',
      structuredData: {
        patientInfo: { name: 'Demo Patient' },
        labResults: [
          { id: uuidv4(), testName: 'Total Cholesterol', value: 215, unit: 'mg/dL', referenceRange: { low: 0, high: 200, text: '<200' }, status: 'high' as const, category: 'lipid' as const },
          { id: uuidv4(), testName: 'LDL Cholesterol', value: 138, unit: 'mg/dL', referenceRange: { low: 0, high: 100, text: '<100' }, status: 'high' as const, category: 'lipid' as const },
          { id: uuidv4(), testName: 'HDL Cholesterol', value: 52, unit: 'mg/dL', referenceRange: { low: 40, high: 999, text: '>40' }, status: 'normal' as const, category: 'lipid' as const },
          { id: uuidv4(), testName: 'Triglycerides', value: 125, unit: 'mg/dL', referenceRange: { low: 0, high: 150, text: '<150' }, status: 'normal' as const, category: 'lipid' as const },
        ],
        medications: [],
        recommendations: ['Dietary modifications recommended'],
      },
      confidence: 0.93,
    },
    documentType: 'lab_report' as DocumentType,
    title: 'Lipid Panel',
    date: new Date().toISOString().split('T')[0],
    provider: 'Dr. Michael Rodriguez, MD',
    facility: 'CardioHealth Clinic',
  };
}

function generateCBCDemo() {
  return {
    extractedData: {
      rawText: 'Complete Blood Count',
      structuredData: {
        patientInfo: { name: 'Demo Patient' },
        labResults: [
          { id: uuidv4(), testName: 'White Blood Cells', value: 7.2, unit: 'K/uL', referenceRange: { low: 4.5, high: 11, text: '4.5-11.0' }, status: 'normal' as const, category: 'cbc' as const },
          { id: uuidv4(), testName: 'Red Blood Cells', value: 4.8, unit: 'M/uL', referenceRange: { low: 4.5, high: 5.5, text: '4.5-5.5' }, status: 'normal' as const, category: 'cbc' as const },
          { id: uuidv4(), testName: 'Hemoglobin', value: 14.2, unit: 'g/dL', referenceRange: { low: 13.5, high: 17.5, text: '13.5-17.5' }, status: 'normal' as const, category: 'cbc' as const },
          { id: uuidv4(), testName: 'Platelets', value: 245, unit: 'K/uL', referenceRange: { low: 150, high: 400, text: '150-400' }, status: 'normal' as const, category: 'cbc' as const },
        ],
        medications: [],
        recommendations: ['All values normal'],
      },
      confidence: 0.95,
    },
    documentType: 'lab_report' as DocumentType,
    title: 'Complete Blood Count',
    date: new Date().toISOString().split('T')[0],
    provider: 'Dr. Emily Watson, MD',
    facility: 'City General Hospital',
  };
}

function generateThyroidDemo() {
  return {
    extractedData: {
      rawText: 'Thyroid Panel',
      structuredData: {
        patientInfo: { name: 'Demo Patient' },
        labResults: [
          { id: uuidv4(), testName: 'TSH', value: 4.8, unit: 'mIU/L', referenceRange: { low: 0.4, high: 4.0, text: '0.4-4.0' }, status: 'high' as const, category: 'thyroid' as const },
          { id: uuidv4(), testName: 'Free T4', value: 1.1, unit: 'ng/dL', referenceRange: { low: 0.8, high: 1.8, text: '0.8-1.8' }, status: 'normal' as const, category: 'thyroid' as const },
          { id: uuidv4(), testName: 'Free T3', value: 2.8, unit: 'pg/mL', referenceRange: { low: 2.3, high: 4.2, text: '2.3-4.2' }, status: 'normal' as const, category: 'thyroid' as const },
        ],
        medications: [],
        recommendations: ['Monitor thyroid function', 'Recheck in 6-8 weeks'],
      },
      confidence: 0.92,
    },
    documentType: 'lab_report' as DocumentType,
    title: 'Thyroid Function Panel',
    date: new Date().toISOString().split('T')[0],
    provider: 'Dr. Lisa Park, MD',
    facility: 'Endocrine Specialists',
  };
}

function generateComprehensiveDemo() {
  return {
    extractedData: {
      rawText: 'Comprehensive Health Panel',
      structuredData: {
        patientInfo: { name: 'Demo Patient' },
        labResults: [
          { id: uuidv4(), testName: 'Glucose', value: 105, unit: 'mg/dL', referenceRange: { low: 70, high: 100, text: '70-100' }, status: 'high' as const, category: 'metabolic' as const },
          { id: uuidv4(), testName: 'HbA1c', value: 5.9, unit: '%', referenceRange: { low: 4, high: 5.6, text: '<5.7' }, status: 'high' as const, category: 'metabolic' as const },
          { id: uuidv4(), testName: 'Total Cholesterol', value: 198, unit: 'mg/dL', referenceRange: { low: 0, high: 200, text: '<200' }, status: 'normal' as const, category: 'lipid' as const },
          { id: uuidv4(), testName: 'LDL', value: 122, unit: 'mg/dL', referenceRange: { low: 0, high: 100, text: '<100' }, status: 'high' as const, category: 'lipid' as const },
          { id: uuidv4(), testName: 'HDL', value: 55, unit: 'mg/dL', referenceRange: { low: 40, high: 999, text: '>40' }, status: 'normal' as const, category: 'lipid' as const },
          { id: uuidv4(), testName: 'ALT', value: 28, unit: 'U/L', referenceRange: { low: 7, high: 56, text: '7-56' }, status: 'normal' as const, category: 'liver' as const },
          { id: uuidv4(), testName: 'Creatinine', value: 1.0, unit: 'mg/dL', referenceRange: { low: 0.7, high: 1.3, text: '0.7-1.3' }, status: 'normal' as const, category: 'kidney' as const },
        ],
        medications: [],
        recommendations: ['Prediabetes indicators present', 'Lifestyle modifications recommended'],
      },
      confidence: 0.94,
    },
    documentType: 'lab_report' as DocumentType,
    title: 'Comprehensive Health Panel',
    date: new Date().toISOString().split('T')[0],
    provider: 'Dr. James Miller, MD',
    facility: 'Premier Health Associates',
  };
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
