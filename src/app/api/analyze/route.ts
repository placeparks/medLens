// SECURE API Route - Keys stay server-side
// /api/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';

// These are SERVER-SIDE only (no NEXT_PUBLIC_ prefix)
const HF_TOKEN = process.env.HF_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { image, action, data } = await req.json();
    
    // Rate limiting (basic)
    // TODO: Add proper rate limiting with Redis
    
    switch (action) {
      case 'extract':
        return await handleExtraction(image);
      case 'explain':
        return await handleExplanation(data);
      case 'interactions':
        return await handleInteractions(data.medications);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

async function handleExtraction(imageBase64: string) {
  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'API not configured' }, { status: 500 });
  }

  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
  let mimeType = 'image/jpeg';
  if (imageBase64.includes('data:image/png')) mimeType = 'image/png';
  
  const prompt = `You are a medical document analyzer. Extract ALL information from this medical document into structured JSON.

Return ONLY valid JSON with this structure:
{
  "documentType": "lab_report|discharge_summary|imaging|prescription|other",
  "title": "Document title",
  "date": "YYYY-MM-DD",
  "provider": "Doctor name",
  "facility": "Facility name",
  "patientInfo": { "name": "", "dateOfBirth": "", "gender": "" },
  "labResults": [{ "testName": "", "value": "", "unit": "", "referenceRange": {"low": 0, "high": 0, "text": ""}, "status": "normal|low|high|critical", "category": "metabolic|lipid|cbc|thyroid|liver|kidney|other" }],
  "medications": [{ "name": "", "dosage": "", "frequency": "" }],
  "recommendations": []
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
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
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Parse and validate response
  let parsed;
  try {
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
    if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
    if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
    parsed = JSON.parse(jsonText.trim());
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse response');
    }
  }
  
  return NextResponse.json({ success: true, data: parsed });
}

async function handleExplanation(data: any) {
  if (!HF_TOKEN) {
    // Return local explanation if no API
    return NextResponse.json({
      success: true,
      explanation: generateLocalExplanation(data)
    });
  }

  const prompt = `You are a caring medical assistant. Explain these lab results in simple terms a patient can understand. Be reassuring but honest. Do NOT give medical advice.

Data: ${JSON.stringify(data)}

Explanation:`;

  const response = await fetch(
    'https://api-inference.huggingface.co/models/google/gemma-2-9b-it',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({
      success: true,
      explanation: generateLocalExplanation(data)
    });
  }

  const result = await response.json();
  return NextResponse.json({
    success: true,
    explanation: result[0]?.generated_text || generateLocalExplanation(data)
  });
}

async function handleInteractions(medications: string[]) {
  if (medications.length < 2) {
    return NextResponse.json({
      success: true,
      result: 'Add at least 2 medications to check interactions.'
    });
  }

  // For production: Use a validated drug interaction database
  // DrugBank API, RxNorm, or similar
  
  // For now, return educational disclaimer
  return NextResponse.json({
    success: true,
    result: `## Medication Review: ${medications.join(', ')}

⚠️ **Important Notice**

For accurate drug interaction information, please:
1. Consult your pharmacist
2. Use verified resources like drugs.com or medscape
3. Talk to your doctor before making any changes

This tool cannot provide validated drug interaction data. Always verify with a healthcare professional.`,
    disclaimer: true
  });
}

function generateLocalExplanation(data: any): string {
  const labResults = data.labResults || [];
  const normal = labResults.filter((r: any) => r.status === 'normal');
  const abnormal = labResults.filter((r: any) => r.status !== 'normal');
  
  let explanation = "Here's a summary of your results:\n\n";
  
  if (normal.length > 0) {
    explanation += `✓ ${normal.length} tests are within normal range.\n\n`;
  }
  
  if (abnormal.length > 0) {
    explanation += `⚠️ ${abnormal.length} results to discuss with your doctor:\n`;
    abnormal.forEach((r: any) => {
      explanation += `• ${r.testName}: ${r.value} ${r.unit} (${r.status})\n`;
    });
  }
  
  explanation += '\n💡 Always discuss your results with your healthcare provider.';
  
  return explanation;
}
