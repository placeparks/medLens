// API Route for Document Processing
// This can be used for server-side MedGemma calls with API key protection

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, type } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const API_KEY = process.env.GOOGLE_API_KEY;
    
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured', demo: true },
        { status: 200 }
      );
    }

    // Call Google AI API (MedGemma)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: image.replace(/^data:image\/\w+;base64,/, '')
                }
              },
              {
                text: `You are MedGemma, a medical AI. Analyze this medical document and extract all information as JSON with this structure:
{
  "documentType": "lab_report" | "discharge_summary" | "imaging" | "prescription" | "other",
  "title": "Brief title",
  "date": "YYYY-MM-DD or null",
  "provider": "Doctor name or null",
  "facility": "Hospital/clinic or null",
  "labResults": [{ "testName": "", "value": "", "unit": "", "referenceRange": { "low": null, "high": null, "text": "" }, "status": "normal|low|high|critical", "category": "metabolic|lipid|cbc|thyroid|liver|kidney|cardiac|other" }],
  "medications": [{ "name": "", "dosage": "", "frequency": "" }],
  "recommendations": [""],
  "rawText": "Full extracted text"
}`
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Google AI API error:', error);
      return NextResponse.json(
        { error: 'AI processing failed', demo: true },
        { status: 200 }
      );
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON response
    let parsed;
    try {
      let jsonText = content.trim();
      if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
      if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
      if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse response', demo: true },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });

  } catch (error) {
    console.error('Document processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', demo: true },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'MedLens Document Processing API',
    endpoints: {
      POST: 'Process a medical document image',
    },
  });
}
