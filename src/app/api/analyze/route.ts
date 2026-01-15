// SECURE API Route - Keys stay server-side
// /api/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Check both standard and NEXT_PUBLIC variants to be robust to user config
const HF_TOKEN = process.env.HF_TOKEN || process.env.NEXT_PUBLIC_HF_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

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
      case 'summary':
        return await handleSummary(data);
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
  const apiKey = GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    console.error('Google API Key missing');
    return NextResponse.json({ error: 'Server configuration error: Google API Key not found' }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash as per user's available models (2026 era)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const base64Data = imageBase64.replace(/^data:([^;]+);base64,/, '');

    // Improved MIME type detection
    let mimeType = 'image/jpeg';
    const matches = imageBase64.match(/^data:([^;]+);base64,/);
    if (matches && matches[1]) {
      mimeType = matches[1];
    } else if (imageBase64.includes('data:image/png')) {
      mimeType = 'image/png';
    } else if (imageBase64.includes('data:application/pdf')) {
      mimeType = 'application/pdf';
    }

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
    }
    
    If values are not visible, use null or empty string. Do NOT invent data.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = result.response;
    const text = response.text();

    // Parse response
    let parsed;
    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch (e) {
      console.warn('Failed to parse JSON directly, attempting cleanup', text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse response from AI model');
      }
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

async function handleExplanation(data: any) {
  if (!HF_TOKEN) {
    return NextResponse.json({ error: 'Server configuration error: HuggingFace Token not found' }, { status: 500 });
  }

  const prompt = `You are a caring medical assistant. Explain these lab results in simple terms a patient can understand. Be reassuring but honest. Do NOT give medical advice.

Data: ${JSON.stringify(data)}

Explanation:`;

  try {
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
            return_full_text: false
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      explanation: result[0]?.generated_text || "Could not generate explanation."
    });
  } catch (error) {
    console.error('Explanation error:', error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
  }
}

async function handleInteractions(medications: string[]) {
  if (medications.length < 2) {
    return NextResponse.json({
      success: true,
      result: 'Add at least 2 medications to check interactions.'
    });
  }

  // Using Gemma for basic interaction checking as requested, typically a specialized DB is better
  if (!HF_TOKEN) {
    return NextResponse.json({ error: 'Server configuration error: HuggingFace Token not found' }, { status: 500 });
  }

  const prompt = `Check for potential interactions between these medications: ${medications.join(', ')}. 
  List them clearly. If none known, say so. 
  Disclaimer: Always consult a doctor.`;

  try {
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
            temperature: 0.1,
            return_full_text: false
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HF API Error: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      result: result[0]?.generated_text || "No interactions info generated."
    });

  } catch (error) {
    console.error('Interaction check error:', error);
    return NextResponse.json({ error: 'Failed to check interactions' }, { status: 500 });
  }
}

async function handleSummary(data: any) {
  if (!HF_TOKEN) {
    return NextResponse.json({ error: 'Server configuration error: HuggingFace Token not found' }, { status: 500 });
  }

  const { documents } = data; // Expecting documents array

  // Simplification for the prompt
  const summaryData = {
    count: documents.length,
    dates: documents.map((d: any) => d.date),
    types: documents.map((d: any) => d.type),
    abnormalResults: documents.flatMap((d: any) =>
      d.extractedData?.structuredData?.labResults?.filter((r: any) => r.status !== 'normal') || []
    ).map((r: any) => `${r.testName}: ${r.value} ${r.unit}`)
  };

  const prompt = `Create a concise appointment summary for a doctor visit based on these patient records:
${JSON.stringify(summaryData, null, 2)}

Include: 
1. Overview
2. Abnormal Findings
3. Questions for Doctor`;

  try {
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
            return_full_text: false
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HF API Error: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      summary: result[0]?.generated_text || "Could not generate summary."
    });
  } catch (error) {
    console.error('Summary error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
