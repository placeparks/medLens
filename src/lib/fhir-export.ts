// FHIR-lite Export Utility
// Exports medical data in a simplified FHIR-compatible format
// Based on HL7 FHIR R4 (https://hl7.org/fhir/R4/)

import type { MedicalDocument, LabResult, LabTrend } from '@/types/medical';
import { format } from 'date-fns';

// FHIR Resource Types
interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  meta: {
    source: string;
    profile: string[];
  };
  entry: FHIRBundleEntry[];
}

interface FHIRBundleEntry {
  resource: FHIRPatient | FHIRObservation | FHIRDiagnosticReport | FHIRMedicationStatement;
}

interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  name?: { text: string }[];
  gender?: string;
  birthDate?: string;
}

interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  status: 'final' | 'preliminary';
  category: { coding: { system: string; code: string; display: string }[] }[];
  code: { coding: { system: string; code: string; display: string }[]; text: string };
  effectiveDateTime?: string;
  valueQuantity?: { value: number; unit: string; system: string };
  valueString?: string;
  interpretation?: { coding: { system: string; code: string; display: string }[] }[];
  referenceRange?: { low?: { value: number; unit: string }; high?: { value: number; unit: string }; text?: string }[];
}

interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  status: 'final' | 'preliminary';
  category: { coding: { system: string; code: string; display: string }[] }[];
  code: { text: string };
  effectiveDateTime: string;
  issued: string;
  performer?: { display: string }[];
  result: { reference: string }[];
}

interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement';
  id: string;
  status: 'active' | 'completed' | 'stopped';
  medicationCodeableConcept: { text: string };
  dosage?: { text: string }[];
}

// LOINC code mapping for common tests
const LOINC_CODES: Record<string, { code: string; display: string }> = {
  'glucose': { code: '2345-7', display: 'Glucose [Mass/volume] in Serum or Plasma' },
  'hemoglobin a1c': { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  'hba1c': { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  'total cholesterol': { code: '2093-3', display: 'Cholesterol [Mass/volume] in Serum or Plasma' },
  'ldl cholesterol': { code: '2089-1', display: 'LDL Cholesterol' },
  'ldl': { code: '2089-1', display: 'LDL Cholesterol' },
  'hdl cholesterol': { code: '2085-9', display: 'HDL Cholesterol' },
  'hdl': { code: '2085-9', display: 'HDL Cholesterol' },
  'triglycerides': { code: '2571-8', display: 'Triglycerides' },
  'creatinine': { code: '2160-0', display: 'Creatinine [Mass/volume] in Serum or Plasma' },
  'bun': { code: '3094-0', display: 'Urea nitrogen [Mass/volume] in Serum or Plasma' },
  'egfr': { code: '33914-3', display: 'eGFR' },
  'sodium': { code: '2951-2', display: 'Sodium [Moles/volume] in Serum or Plasma' },
  'potassium': { code: '2823-3', display: 'Potassium [Moles/volume] in Serum or Plasma' },
  'tsh': { code: '3016-3', display: 'TSH' },
  'free t4': { code: '3024-7', display: 'Free T4' },
  'free t3': { code: '3051-0', display: 'Free T3' },
  'alt': { code: '1742-6', display: 'ALT' },
  'ast': { code: '1920-8', display: 'AST' },
  'white blood cells': { code: '6690-2', display: 'WBC' },
  'wbc': { code: '6690-2', display: 'WBC' },
  'red blood cells': { code: '789-8', display: 'RBC' },
  'rbc': { code: '789-8', display: 'RBC' },
  'hemoglobin': { code: '718-7', display: 'Hemoglobin' },
  'hematocrit': { code: '4544-3', display: 'Hematocrit' },
  'platelets': { code: '777-3', display: 'Platelets' },
};

// Get LOINC code for a test
function getLoincCode(testName: string): { code: string; display: string } {
  const normalized = testName.toLowerCase().replace(/[,.\-]/g, '').trim();
  
  for (const [key, value] of Object.entries(LOINC_CODES)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  return { code: 'unknown', display: testName };
}

// Convert status to FHIR interpretation
function statusToInterpretation(status: LabResult['status']): { code: string; display: string } {
  switch (status) {
    case 'high':
      return { code: 'H', display: 'High' };
    case 'low':
      return { code: 'L', display: 'Low' };
    case 'critical':
      return { code: 'AA', display: 'Critical abnormal' };
    case 'normal':
      return { code: 'N', display: 'Normal' };
    default:
      return { code: 'U', display: 'Unknown' };
  }
}

// Map lab category to FHIR category
function categoryToFHIRCategory(category: string): { code: string; display: string } {
  const categoryMap: Record<string, { code: string; display: string }> = {
    metabolic: { code: 'chemistry', display: 'Chemistry' },
    lipid: { code: 'chemistry', display: 'Chemistry' },
    cbc: { code: 'hematology', display: 'Hematology' },
    thyroid: { code: 'chemistry', display: 'Chemistry' },
    liver: { code: 'chemistry', display: 'Chemistry' },
    kidney: { code: 'chemistry', display: 'Chemistry' },
    cardiac: { code: 'chemistry', display: 'Chemistry' },
    inflammatory: { code: 'chemistry', display: 'Chemistry' },
    vitamin: { code: 'chemistry', display: 'Chemistry' },
    hormone: { code: 'chemistry', display: 'Chemistry' },
  };
  
  return categoryMap[category] || { code: 'laboratory', display: 'Laboratory' };
}

// Export documents to FHIR Bundle
export function exportToFHIR(documents: MedicalDocument[]): FHIRBundle {
  const patientId = `patient-${Date.now()}`;
  const entries: FHIRBundleEntry[] = [];
  
  // Create patient resource
  const firstDoc = documents[0];
  const patientInfo = firstDoc?.extractedData.structuredData.patientInfo;
  
  const patient: FHIRPatient = {
    resourceType: 'Patient',
    id: patientId,
  };
  
  if (patientInfo?.name) {
    patient.name = [{ text: patientInfo.name }];
  }
  if (patientInfo?.gender) {
    patient.gender = patientInfo.gender.toLowerCase();
  }
  if (patientInfo?.dateOfBirth) {
    patient.birthDate = patientInfo.dateOfBirth;
  }
  
  entries.push({ resource: patient });
  
  // Create observations for each lab result
  documents.forEach((doc, docIndex) => {
    const labResults = doc.extractedData.structuredData.labResults || [];
    const observationRefs: string[] = [];
    
    labResults.forEach((result, resultIndex) => {
      const observationId = `obs-${docIndex}-${resultIndex}`;
      const loinc = getLoincCode(result.testName);
      const interpretation = statusToInterpretation(result.status);
      const fhirCategory = categoryToFHIRCategory(result.category);
      
      const observation: FHIRObservation = {
        resourceType: 'Observation',
        id: observationId,
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: fhirCategory.code,
            display: fhirCategory.display,
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: loinc.code,
            display: loinc.display,
          }],
          text: result.testName,
        },
        effectiveDateTime: doc.date,
        interpretation: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: interpretation.code,
            display: interpretation.display,
          }]
        }],
      };
      
      // Add value
      if (typeof result.value === 'number') {
        observation.valueQuantity = {
          value: result.value,
          unit: result.unit,
          system: 'http://unitsofmeasure.org',
        };
      } else {
        observation.valueString = String(result.value);
      }
      
      // Add reference range
      if (result.referenceRange) {
        observation.referenceRange = [{
          low: result.referenceRange.low ? { value: result.referenceRange.low, unit: result.unit } : undefined,
          high: result.referenceRange.high ? { value: result.referenceRange.high, unit: result.unit } : undefined,
          text: result.referenceRange.text,
        }];
      }
      
      entries.push({ resource: observation });
      observationRefs.push(`Observation/${observationId}`);
    });
    
    // Create DiagnosticReport for each document
    const reportId = `report-${docIndex}`;
    const report: FHIRDiagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: reportId,
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          code: 'LAB',
          display: 'Laboratory',
        }]
      }],
      code: { text: doc.title },
      effectiveDateTime: doc.date,
      issued: new Date().toISOString(),
      result: observationRefs.map(ref => ({ reference: ref })),
    };
    
    if (doc.provider) {
      report.performer = [{ display: doc.provider }];
    }
    
    entries.push({ resource: report });
    
    // Add medications as MedicationStatements
    const medications = doc.extractedData.structuredData.medications || [];
    medications.forEach((med, medIndex) => {
      const medStatement: FHIRMedicationStatement = {
        resourceType: 'MedicationStatement',
        id: `med-${docIndex}-${medIndex}`,
        status: 'active',
        medicationCodeableConcept: { text: med.name },
      };
      
      if (med.dosage || med.frequency) {
        medStatement.dosage = [{
          text: [med.dosage, med.frequency].filter(Boolean).join(' - '),
        }];
      }
      
      entries.push({ resource: medStatement });
    });
  });
  
  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    meta: {
      source: 'MedLens',
      profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
    },
    entry: entries,
  };
}

// Download FHIR bundle as JSON
export function downloadFHIR(documents: MedicalDocument[]): void {
  const bundle = exportToFHIR(documents);
  const json = JSON.stringify(bundle, null, 2);
  
  const blob = new Blob([json], { type: 'application/fhir+json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `medlens-export-${format(new Date(), 'yyyy-MM-dd')}.fhir.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export as simplified CSV for spreadsheet use
export function exportToCSV(documents: MedicalDocument[]): void {
  const rows: string[][] = [
    ['Date', 'Document', 'Test Name', 'Value', 'Unit', 'Reference Range', 'Status', 'Category']
  ];
  
  documents.forEach(doc => {
    const labResults = doc.extractedData.structuredData.labResults || [];
    labResults.forEach(result => {
      rows.push([
        doc.date,
        doc.title,
        result.testName,
        String(result.value),
        result.unit,
        result.referenceRange?.text || '',
        result.status,
        result.category,
      ]);
    });
  });
  
  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `medlens-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export summary for Apple Health / Google Fit integration
export function exportHealthSummary(documents: MedicalDocument[]) {
  return {
    exportDate: new Date().toISOString(),
    source: 'MedLens',
    version: '1.0',
    documentCount: documents.length,
    dateRange: {
      start: documents[documents.length - 1]?.date || null,
      end: documents[0]?.date || null,
    },
    metrics: extractKeyMetrics(documents),
  };
}

function extractKeyMetrics(documents: MedicalDocument[]) {
  const metrics: Record<string, { latest: number | string; date: string; status: string }> = {};
  
  // Get latest value for each test type
  documents.forEach(doc => {
    const labResults = doc.extractedData.structuredData.labResults || [];
    labResults.forEach(result => {
      const key = result.testName.toLowerCase();
      if (!metrics[key] || doc.date > metrics[key].date) {
        metrics[key] = {
          latest: result.value,
          date: doc.date,
          status: result.status,
        };
      }
    });
  });
  
  return metrics;
}
