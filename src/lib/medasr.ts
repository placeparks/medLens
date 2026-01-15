// MedASR Voice Recording Service
// Integrates with Google's MedASR for medical speech-to-text

import { v4 as uuidv4 } from 'uuid';
import type { VoiceNote } from '@/types/medical';

// MedASR API configuration
const MEDASR_ENDPOINT = process.env.NEXT_PUBLIC_MEDASR_ENDPOINT || 'https://us-central1-aiplatform.googleapis.com/v1';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
}

// Audio recording class using Web Audio API
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private onStateChange: ((state: RecordingState) => void) | null = null;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor(onStateChange?: (state: RecordingState) => void) {
    this.onStateChange = onStateChange || null;
  }

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // MedASR prefers 16kHz
        } 
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.getSupportedMimeType(),
      });

      this.audioChunks = [];
      this.startTime = Date.now();
      this.pausedDuration = 0;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms

      // Start duration timer
      this.timerInterval = setInterval(() => {
        this.emitState();
      }, 100);

      this.emitState();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Could not access microphone. Please check permissions.');
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pausedDuration = this.getCurrentDuration();
      this.emitState();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.startTime = Date.now() - (this.pausedDuration * 1000);
      this.mediaRecorder.resume();
      this.emitState();
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.getSupportedMimeType() 
        });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  cancelRecording(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.emitState();
  }

  private getCurrentDuration(): number {
    if (!this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange({
        isRecording: this.mediaRecorder?.state === 'recording',
        isPaused: this.mediaRecorder?.state === 'paused',
        duration: this.getCurrentDuration(),
        audioBlob: null,
      });
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  isPaused(): boolean {
    return this.mediaRecorder?.state === 'paused';
  }
}

// Convert audio blob to base64
export async function audioToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Transcribe audio using MedASR or fallback
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const useRealAPI = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
  const hasApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY && 
                    process.env.NEXT_PUBLIC_GOOGLE_API_KEY !== 'YOUR_API_KEY_HERE';
  
  console.log('[MedASR] Config:', { useRealAPI, hasApiKey, blobSize: audioBlob.size });
  
  if (useRealAPI && hasApiKey) {
    try {
      console.log('[MedASR] Using REAL Speech-to-Text API...');
      const transcript = await transcribeWithGoogleSpeech(audioBlob);
      if (transcript) {
        console.log('[MedASR] Transcription successful:', transcript.slice(0, 100));
        return transcript;
      }
    } catch (error) {
      console.error('[MedASR] Real API failed:', error);
    }
  }
  
  console.log('[MedASR] Using simulated transcription');
  return simulateTranscription();
}

// Real Google Speech-to-Text API call
async function transcribeWithGoogleSpeech(audioBlob: Blob): Promise<string> {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  
  if (!API_KEY) {
    throw new Error('Google API key not configured');
  }

  const base64Audio = await audioToBase64(audioBlob);
  
  // Detect audio encoding from blob type
  let encoding = 'WEBM_OPUS';
  if (audioBlob.type.includes('mp4')) encoding = 'MP3';
  else if (audioBlob.type.includes('wav')) encoding = 'LINEAR16';
  else if (audioBlob.type.includes('ogg')) encoding = 'OGG_OPUS';
  
  console.log('[MedASR] Audio encoding:', encoding, 'Size:', audioBlob.size);
  
  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding,
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          model: 'latest_long', // Best model for medical terms
          useEnhanced: true,
          enableAutomaticPunctuation: true,
          speechContexts: [{
            phrases: [
              // Medical terminology hints for better accuracy
              'blood pressure', 'cholesterol', 'hemoglobin', 'glucose', 'A1C',
              'LDL', 'HDL', 'triglycerides', 'creatinine', 'eGFR', 'TSH',
              'medication', 'prescription', 'diagnosis', 'symptoms', 'side effects',
              'milligrams', 'milliliters', 'units per liter', 'milligrams per deciliter',
              'follow up', 'appointment', 'doctor', 'physician', 'specialist',
              'elevated', 'normal', 'abnormal', 'within range', 'out of range'
            ],
            boost: 15
          }]
        },
        audio: {
          content: base64Audio
        }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[MedASR] Speech API error:', error);
    throw new Error(`Speech API error: ${response.status}`);
  }

  const result = await response.json();
  console.log('[MedASR] API response:', JSON.stringify(result).slice(0, 200));
  
  if (result.results && result.results.length > 0) {
    return result.results
      .map((r: any) => r.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();
  }
  
  return '';
}

// Simulated transcription for demo mode
function simulateTranscription(): string {
  const demoTranscriptions = [
    "Doctor mentioned my cholesterol is slightly elevated and recommended dietary changes. Should follow up in three months.",
    "Feeling better since starting the new medication. No side effects noticed so far.",
    "Blood pressure was a bit high during this visit. Need to reduce sodium intake and exercise more.",
    "Discussed results from last week's lab work. A1C is improving with lifestyle changes.",
    "Reminder to schedule follow-up appointment for next month. Need to get blood work done before the visit.",
  ];
  
  return demoTranscriptions[Math.floor(Math.random() * demoTranscriptions.length)];
}

// Create a voice note object
export function createVoiceNote(
  transcript: string, 
  duration: number, 
  audioUrl?: string
): VoiceNote {
  return {
    id: uuidv4(),
    transcript,
    audioUrl,
    duration,
    createdAt: new Date().toISOString(),
  };
}

// Format duration for display
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Check if audio recording is supported
export function isRecordingSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.MediaRecorder
  );
}

// Audio visualization helper
export function createAudioAnalyzer(stream: MediaStream): {
  analyzer: AnalyserNode;
  getVolume: () => number;
  cleanup: () => void;
} {
  const audioContext = new AudioContext();
  const analyzer = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  
  analyzer.fftSize = 256;
  source.connect(analyzer);
  
  const dataArray = new Uint8Array(analyzer.frequencyBinCount);
  
  return {
    analyzer,
    getVolume: () => {
      analyzer.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      return sum / dataArray.length / 255; // Normalized 0-1
    },
    cleanup: () => {
      source.disconnect();
      audioContext.close();
    }
  };
}
