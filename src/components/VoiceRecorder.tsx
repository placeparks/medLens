'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Square,
  Pause,
  Play,
  X,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  AudioRecorder,
  transcribeAudio,
  createVoiceNote,
  formatDuration,
  isRecordingSupported,
} from '@/lib/medasr';
import type { VoiceNote } from '@/types/medical';

interface VoiceRecorderProps {
  onSave: (voiceNote: VoiceNote) => void;
  onCancel: () => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'review';

export default function VoiceRecorder({ onSave, onCancel }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  const recorderRef = useRef<AudioRecorder | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    setIsSupported(isRecordingSupported());
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      
      recorderRef.current = new AudioRecorder((recordingState) => {
        setDuration(recordingState.duration);
      });
      
      await recorderRef.current.startRecording();
      setState('recording');
      
      // Simulate volume visualization
      const updateVolume = () => {
        if (state === 'recording') {
          setVolumeLevel(Math.random() * 0.5 + 0.3); // Simulated volume
          animationRef.current = requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setState('idle');
    }
  };

  const pauseRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.pauseRecording();
      setState('paused');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.resumeRecording();
      setState('recording');
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;
    
    try {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      const blob = await recorderRef.current.stopRecording();
      setAudioBlob(blob);
      
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      // Start transcription
      setState('processing');
      setIsTranscribing(true);
      
      try {
        const transcribedText = await transcribeAudio(blob);
        setTranscript(transcribedText);
      } catch (transcribeError) {
        console.error('Transcription error:', transcribeError);
        setTranscript(''); // Allow manual input
      }
      
      setIsTranscribing(false);
      setState('review');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      setState('idle');
    }
  };

  const cancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.cancelRecording();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    onCancel();
  };

  const saveVoiceNote = () => {
    if (!transcript.trim()) {
      setError('Please add a transcript for your voice note');
      return;
    }
    
    const voiceNote = createVoiceNote(transcript, duration, audioUrl || undefined);
    onSave(voiceNote);
  };

  if (!isSupported) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-coral-100 flex items-center justify-center">
          <MicOff className="w-8 h-8 text-coral-600" />
        </div>
        <h3 className="text-lg font-medium text-midnight-900 mb-2">
          Recording Not Supported
        </h3>
        <p className="text-midnight-500 text-sm">
          Your browser doesn't support audio recording. Please try using Chrome, Firefox, or Safari.
        </p>
        <button onClick={onCancel} className="btn-secondary mt-4">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AnimatePresence mode="wait">
        {/* Idle State */}
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <h3 className="text-lg font-display font-semibold text-midnight-900 mb-2">
              Add Voice Note
            </h3>
            <p className="text-midnight-500 text-sm mb-6">
              Record your thoughts, symptoms, or notes about this document
            </p>
            
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-coral-50 text-coral-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <button
              onClick={startRecording}
              className="w-20 h-20 mx-auto rounded-full bg-coral-500 text-white flex items-center justify-center shadow-lg hover:bg-coral-600 transition-colors"
            >
              <Mic className="w-8 h-8" />
            </button>
            
            <p className="text-sm text-midnight-400 mt-4">
              Tap to start recording
            </p>
            
            <button
              onClick={onCancel}
              className="btn-ghost mt-4"
            >
              Cancel
            </button>
          </motion.div>
        )}
        
        {/* Recording State */}
        {(state === 'recording' || state === 'paused') && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <h3 className="text-lg font-display font-semibold text-midnight-900 mb-6">
              {state === 'recording' ? 'Recording...' : 'Paused'}
            </h3>
            
            {/* Waveform visualization */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              {/* Pulsing rings */}
              {state === 'recording' && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-coral-200"
                    animate={{
                      scale: [1, 1.2 + volumeLevel * 0.3, 1],
                      opacity: [0.3, 0.1, 0.3],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                    }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full bg-coral-300"
                    animate={{
                      scale: [1, 1.1 + volumeLevel * 0.2, 1],
                      opacity: [0.4, 0.2, 0.4],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                    }}
                  />
                </>
              )}
              
              {/* Main button */}
              <div className={`absolute inset-4 rounded-full flex items-center justify-center ${
                state === 'recording' ? 'bg-coral-500' : 'bg-midnight-400'
              }`}>
                {state === 'recording' ? (
                  <Mic className="w-10 h-10 text-white" />
                ) : (
                  <Pause className="w-10 h-10 text-white" />
                )}
              </div>
            </div>
            
            {/* Duration */}
            <p className="text-3xl font-mono font-semibold text-midnight-900 mb-6">
              {formatDuration(duration)}
            </p>
            
            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={cancelRecording}
                className="w-12 h-12 rounded-full bg-cream-100 text-midnight-600 flex items-center justify-center hover:bg-cream-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {state === 'recording' ? (
                <button
                  onClick={pauseRecording}
                  className="w-12 h-12 rounded-full bg-midnight-100 text-midnight-600 flex items-center justify-center hover:bg-midnight-200 transition-colors"
                >
                  <Pause className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="w-12 h-12 rounded-full bg-sage-100 text-sage-600 flex items-center justify-center hover:bg-sage-200 transition-colors"
                >
                  <Play className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={stopRecording}
                className="w-12 h-12 rounded-full bg-sage-500 text-white flex items-center justify-center hover:bg-sage-600 transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-midnight-400 mt-4">
              {state === 'recording' ? 'Tap ■ to finish' : 'Tap ▶ to resume or ■ to finish'}
            </p>
          </motion.div>
        )}
        
        {/* Processing State */}
        {state === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-sage-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-sage-600 animate-spin" />
            </div>
            <h3 className="text-lg font-display font-semibold text-midnight-900 mb-2">
              Processing...
            </h3>
            <p className="text-midnight-500 text-sm">
              Transcribing your voice note with MedASR
            </p>
          </motion.div>
        )}
        
        {/* Review State */}
        {state === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-display font-semibold text-midnight-900 mb-4">
              Review Voice Note
            </h3>
            
            {/* Audio playback */}
            {audioUrl && (
              <div className="mb-4 p-3 rounded-xl bg-cream-100">
                <audio src={audioUrl} controls className="w-full h-10" />
                <p className="text-xs text-midnight-400 mt-1 text-center">
                  Duration: {formatDuration(duration)}
                </p>
              </div>
            )}
            
            {/* Transcript */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-midnight-700 mb-2">
                Transcript
                <span className="text-midnight-400 font-normal ml-1">(edit if needed)</span>
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Enter or edit the transcript of your voice note..."
                className="input min-h-[120px] resize-none"
              />
            </div>
            
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-coral-50 text-coral-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={cancelRecording}
                className="btn-secondary flex-1"
              >
                Discard
              </button>
              <button
                onClick={saveVoiceNote}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save Note
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
