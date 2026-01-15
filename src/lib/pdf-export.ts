// PDF Export Service for Doctor Handoff Summaries
// Generates professional PDF reports from medical documents

import { format, parseISO } from 'date-fns';
import type { MedicalDocument, LabResult, LabTrend } from '@/types/medical';

// PDF generation using browser print / jsPDF
interface PDFOptions {
  includeOriginalImage?: boolean;
  includeTrends?: boolean;
  includeVoiceNotes?: boolean;
  dateRange?: { start: string; end: string };
}

// Generate HTML content for PDF export
export function generatePDFContent(
  documents: MedicalDocument[],
  labTrends: LabTrend[],
  patientName?: string,
  options: PDFOptions = {}
): string {
  const {
    includeOriginalImage = false,
    includeTrends = true,
    includeVoiceNotes = true,
  } = options;

  // Sort documents by date (newest first)
  const sortedDocs = [...documents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Get all unique abnormal results across documents
  const abnormalResults = new Map<string, { result: LabResult; date: string }[]>();
  sortedDocs.forEach(doc => {
    doc.extractedData.structuredData.labResults?.forEach(result => {
      if (result.status !== 'normal') {
        const key = result.testName.toLowerCase();
        if (!abnormalResults.has(key)) {
          abnormalResults.set(key, []);
        }
        abnormalResults.get(key)!.push({ result, date: doc.date });
      }
    });
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Health Summary Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 0.5in;
    }
    
    .header {
      border-bottom: 2px solid #617361;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    
    .header h1 {
      font-size: 24pt;
      font-weight: 700;
      color: #617361;
      margin-bottom: 4px;
    }
    
    .header .subtitle {
      font-size: 12pt;
      color: #666;
    }
    
    .header .generated {
      font-size: 9pt;
      color: #999;
      margin-top: 8px;
    }
    
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: 600;
      color: #617361;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    
    .summary-box {
      background: #f8f9f8;
      border-left: 4px solid #617361;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    
    .summary-box.warning {
      background: #fef9f0;
      border-left-color: #f59e0b;
    }
    
    .summary-box h3 {
      font-size: 11pt;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .summary-box ul {
      margin-left: 20px;
    }
    
    .summary-box li {
      margin-bottom: 4px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    
    th, td {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid #e5e5e5;
    }
    
    th {
      background: #f8f9f8;
      font-weight: 600;
      font-size: 10pt;
      color: #666;
    }
    
    .status-normal {
      color: #16a34a;
    }
    
    .status-high {
      color: #f59e0b;
      font-weight: 500;
    }
    
    .status-low {
      color: #3b82f6;
      font-weight: 500;
    }
    
    .status-critical {
      color: #dc2626;
      font-weight: 600;
    }
    
    .document-card {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    
    .document-card h4 {
      font-size: 12pt;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .document-card .meta {
      font-size: 10pt;
      color: #666;
      margin-bottom: 12px;
    }
    
    .trend-indicator {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 500;
    }
    
    .trend-improving {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .trend-worsening {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .trend-stable {
      background: #f3f4f6;
      color: #6b7280;
    }
    
    .voice-note {
      background: #f0f9ff;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      font-style: italic;
    }
    
    .voice-note .date {
      font-size: 9pt;
      color: #666;
      font-style: normal;
      margin-top: 4px;
    }
    
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      font-size: 9pt;
      color: #999;
      text-align: center;
    }
    
    .disclaimer {
      background: #fef9f0;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 12px;
      margin-top: 24px;
      font-size: 9pt;
      color: #92400e;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .document-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Health Summary Report</h1>
    <div class="subtitle">${patientName || 'Patient Health Record'}</div>
    <div class="generated">Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')} via MedLens</div>
  </div>
  
  <!-- Executive Summary -->
  <div class="section">
    <h2 class="section-title">📋 Summary</h2>
    
    <div class="summary-box">
      <h3>Documents Overview</h3>
      <p>${sortedDocs.length} medical document${sortedDocs.length !== 1 ? 's' : ''} on file</p>
      <p>Date range: ${sortedDocs.length > 0 ? format(parseISO(sortedDocs[sortedDocs.length - 1].date), 'MMM d, yyyy') : 'N/A'} - ${sortedDocs.length > 0 ? format(parseISO(sortedDocs[0].date), 'MMM d, yyyy') : 'N/A'}</p>
    </div>
    
    ${abnormalResults.size > 0 ? `
    <div class="summary-box warning">
      <h3>⚠️ Items Requiring Attention</h3>
      <ul>
        ${Array.from(abnormalResults.entries()).map(([name, items]) => {
          const latest = items[0];
          return `<li><strong>${latest.result.testName}</strong>: ${latest.result.value} ${latest.result.unit} (${latest.result.status}) - ${format(parseISO(latest.date), 'MMM d, yyyy')}</li>`;
        }).join('')}
      </ul>
    </div>
    ` : `
    <div class="summary-box">
      <h3>✅ All Results Normal</h3>
      <p>No abnormal lab values detected in recent documents.</p>
    </div>
    `}
  </div>
  
  ${includeTrends && labTrends.length > 0 ? `
  <!-- Lab Trends -->
  <div class="section">
    <h2 class="section-title">📈 Lab Value Trends</h2>
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>Latest Value</th>
          <th>Reference Range</th>
          <th>Trend</th>
        </tr>
      </thead>
      <tbody>
        ${labTrends.slice(0, 10).map(trend => {
          const latest = trend.dataPoints[trend.dataPoints.length - 1];
          const trendClass = trend.currentStatus === 'improving' ? 'trend-improving' :
                            trend.currentStatus === 'worsening' ? 'trend-worsening' : 'trend-stable';
          const trendLabel = trend.currentStatus === 'improving' ? '↓ Improving' :
                            trend.currentStatus === 'worsening' ? '↑ Worsening' : '→ Stable';
          return `
            <tr>
              <td>${trend.testName}</td>
              <td class="status-${latest.status}">${latest.value} ${trend.unit}</td>
              <td>${trend.referenceRange ? `${trend.referenceRange.low} - ${trend.referenceRange.high}` : 'N/A'}</td>
              <td><span class="trend-indicator ${trendClass}">${trendLabel}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  <!-- Document Details -->
  <div class="section">
    <h2 class="section-title">📄 Document History</h2>
    
    ${sortedDocs.map(doc => `
    <div class="document-card">
      <h4>${doc.title}</h4>
      <div class="meta">
        ${format(parseISO(doc.date), 'MMMM d, yyyy')}
        ${doc.facility ? ` • ${doc.facility}` : ''}
        ${doc.provider ? ` • ${doc.provider}` : ''}
      </div>
      
      ${doc.extractedData.structuredData.labResults && doc.extractedData.structuredData.labResults.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Result</th>
            <th>Reference</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${doc.extractedData.structuredData.labResults.map(result => `
            <tr>
              <td>${result.testName}</td>
              <td>${result.value} ${result.unit}</td>
              <td>${result.referenceRange?.text || 'N/A'}</td>
              <td class="status-${result.status}">${result.status.toUpperCase()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
      
      ${doc.extractedData.structuredData.medications && doc.extractedData.structuredData.medications.length > 0 ? `
      <p><strong>Medications:</strong></p>
      <ul>
        ${doc.extractedData.structuredData.medications.map(med => `
          <li>${med.name}${med.dosage ? ` - ${med.dosage}` : ''}${med.frequency ? ` (${med.frequency})` : ''}</li>
        `).join('')}
      </ul>
      ` : ''}
      
      ${includeVoiceNotes && doc.voiceNotes && doc.voiceNotes.length > 0 ? `
      <p><strong>Patient Notes:</strong></p>
      ${doc.voiceNotes.map(note => `
        <div class="voice-note">
          "${note.transcript}"
          <div class="date">${format(parseISO(note.createdAt), 'MMM d, yyyy')}</div>
        </div>
      `).join('')}
      ` : ''}
    </div>
    `).join('')}
  </div>
  
  <div class="disclaimer">
    <strong>Important:</strong> This report is generated from patient-uploaded documents and AI analysis. 
    It is intended for informational purposes only and should not replace professional medical advice. 
    Please verify all information with original source documents and consult with healthcare providers 
    for medical decisions.
  </div>
  
  <div class="footer">
    <p>Generated by MedLens - Your Medical Document Companion</p>
    <p>Powered by MedGemma AI</p>
  </div>
</body>
</html>
  `;

  return html;
}

// Open print dialog for PDF generation
export function printPDF(
  documents: MedicalDocument[],
  labTrends: LabTrend[],
  patientName?: string,
  options?: PDFOptions
): void {
  const html = generatePDFContent(documents, labTrends, patientName, options);
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
}

// Download as HTML file (can be converted to PDF)
export function downloadHTML(
  documents: MedicalDocument[],
  labTrends: LabTrend[],
  patientName?: string,
  options?: PDFOptions
): void {
  const html = generatePDFContent(documents, labTrends, patientName, options);
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `health-summary-${format(new Date(), 'yyyy-MM-dd')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate shareable summary text
export function generateTextSummary(
  documents: MedicalDocument[],
  labTrends: LabTrend[]
): string {
  const sortedDocs = [...documents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let summary = `HEALTH SUMMARY REPORT\n`;
  summary += `Generated: ${format(new Date(), 'MMMM d, yyyy')}\n`;
  summary += `${'='.repeat(50)}\n\n`;

  summary += `DOCUMENTS ON FILE: ${sortedDocs.length}\n`;
  if (sortedDocs.length > 0) {
    summary += `Date Range: ${format(parseISO(sortedDocs[sortedDocs.length - 1].date), 'MMM d, yyyy')} - ${format(parseISO(sortedDocs[0].date), 'MMM d, yyyy')}\n`;
  }
  summary += `\n`;

  // Abnormal results
  const abnormalResults: { test: string; value: string; status: string; date: string }[] = [];
  sortedDocs.forEach(doc => {
    doc.extractedData.structuredData.labResults?.forEach(result => {
      if (result.status !== 'normal') {
        abnormalResults.push({
          test: result.testName,
          value: `${result.value} ${result.unit}`,
          status: result.status,
          date: doc.date,
        });
      }
    });
  });

  if (abnormalResults.length > 0) {
    summary += `ITEMS REQUIRING ATTENTION:\n`;
    summary += `${'-'.repeat(30)}\n`;
    abnormalResults.forEach(item => {
      summary += `• ${item.test}: ${item.value} (${item.status.toUpperCase()}) - ${format(parseISO(item.date), 'MMM d, yyyy')}\n`;
    });
    summary += `\n`;
  }

  // Trends
  if (labTrends.length > 0) {
    summary += `LAB VALUE TRENDS:\n`;
    summary += `${'-'.repeat(30)}\n`;
    labTrends.slice(0, 5).forEach(trend => {
      const latest = trend.dataPoints[trend.dataPoints.length - 1];
      const arrow = trend.currentStatus === 'improving' ? '↓' :
                   trend.currentStatus === 'worsening' ? '↑' : '→';
      summary += `• ${trend.testName}: ${latest.value} ${trend.unit} ${arrow} ${trend.currentStatus}\n`;
    });
    summary += `\n`;
  }

  summary += `${'='.repeat(50)}\n`;
  summary += `Generated by MedLens - Powered by MedGemma AI\n`;

  return summary;
}

// Copy summary to clipboard
export async function copySummaryToClipboard(
  documents: MedicalDocument[],
  labTrends: LabTrend[]
): Promise<void> {
  const summary = generateTextSummary(documents, labTrends);
  await navigator.clipboard.writeText(summary);
}
