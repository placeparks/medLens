'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  FileText, 
  X, 
  Check, 
  Loader2,
  Image as ImageIcon,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { extractDocumentData, generateExplanation, generateAlerts } from '@/lib/medgemma';
import { useMedLensStore } from '@/lib/store';
import type { MedicalDocument, DocumentType } from '@/types/medical';

interface DocumentUploadProps {
  onComplete: (doc: MedicalDocument) => void;
  onCancel: () => void;
}

type UploadStep = 'select' | 'preview' | 'processing' | 'complete';

export default function DocumentUpload({ onComplete, onCancel }: DocumentUploadProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('lab_report');
  const [processingStep, setProcessingStep] = useState(0);
  const [processedDocument, setProcessedDocument] = useState<MedicalDocument | null>(null);
  
  const { setProcessing, addAlerts } = useMedLensStore();
  
  const processingSteps = [
    { label: 'Analyzing document', icon: '🔍' },
    { label: 'Extracting medical data', icon: '📊' },
    { label: 'Understanding context', icon: '🧠' },
    { label: 'Generating insights', icon: '✨' },
  ];
  
  const isRealAPI = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setStep('preview');
      };
      reader.readAsDataURL(file);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });
  
  const processDocument = async () => {
    if (!selectedImage) return;
    
    setStep('processing');
    setProcessing(true);
    
    // Simulate processing steps with delays
    for (let i = 0; i < processingSteps.length; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    }
    
    try {
      // Extract document data using MedGemma
      const { extractedData, documentType: detectedType, title, date, provider, facility } = 
        await extractDocumentData(selectedImage, documentType);
      
      // Generate explanation
      const explanation = await generateExplanation(extractedData);
      
      // Create document object
      const doc: MedicalDocument = {
        id: uuidv4(),
        type: detectedType,
        title,
        date,
        provider,
        facility,
        originalImage: selectedImage,
        extractedData,
        explanation,
        voiceNotes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Generate and store alerts
      const alerts = generateAlerts(doc);
      if (alerts.length > 0) {
        addAlerts(alerts);
      }
      
      setProcessedDocument(doc);
      setStep('complete');
    } catch (error) {
      console.error('Error processing document:', error);
      // Handle error state
    } finally {
      setProcessing(false);
    }
  };
  
  const documentTypes: { type: DocumentType; label: string; icon: string }[] = [
    { type: 'lab_report', label: 'Lab Results', icon: '🔬' },
    { type: 'imaging', label: 'Imaging', icon: '📷' },
    { type: 'prescription', label: 'Prescription', icon: '💊' },
    { type: 'discharge_summary', label: 'Discharge Summary', icon: '🏥' },
    { type: 'other', label: 'Other', icon: '📄' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-semibold text-midnight-900">
            {step === 'select' && 'Scan Document'}
            {step === 'preview' && 'Review Document'}
            {step === 'processing' && 'Analyzing...'}
            {step === 'complete' && 'Analysis Complete'}
          </h2>
          <p className="text-midnight-500 mt-1">
            {step === 'select' && 'Upload a photo of your medical document'}
            {step === 'preview' && 'Confirm the document looks correct'}
            {step === 'processing' && 'MedGemma is extracting your medical data'}
            {step === 'complete' && 'Your document has been processed'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-xl hover:bg-cream-100 transition-colors"
        >
          <X className="w-5 h-5 text-midnight-500" />
        </button>
      </div>
      
      <AnimatePresence mode="wait">
        {/* Step 1: Select/Upload */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                card cursor-pointer border-2 border-dashed transition-all duration-200
                ${isDragActive 
                  ? 'border-sage-400 bg-sage-50' 
                  : 'border-cream-300 hover:border-sage-300 hover:bg-cream-50'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sage-100 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-sage-600" />
                </div>
                <p className="text-lg font-medium text-midnight-800 mb-2">
                  {isDragActive ? 'Drop your document here' : 'Drop a document or click to upload'}
                </p>
                <p className="text-sm text-midnight-500">
                  Supports images (PNG, JPG, WebP) and PDFs up to 10MB
                </p>
              </div>
            </div>
            
            {/* Camera option for mobile */}
            <div className="mt-4 flex gap-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onDrop([file]);
                    }
                  }}
                />
                <div className="btn-secondary w-full flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" />
                  Take Photo
                </div>
              </label>
            </div>
            
            {/* Tips */}
            <div className="mt-8 p-4 rounded-2xl bg-sage-50 border border-sage-100">
              <h4 className="font-medium text-sage-800 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips for best results
              </h4>
              <ul className="text-sm text-sage-700 space-y-1">
                <li>• Ensure the document is well-lit and in focus</li>
                <li>• Capture the entire document in the frame</li>
                <li>• Avoid shadows and reflections</li>
                <li>• For multi-page documents, upload one page at a time</li>
              </ul>
            </div>
          </motion.div>
        )}
        
        {/* Step 2: Preview */}
        {step === 'preview' && selectedImage && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Image Preview */}
            <div className="card p-2 mb-6">
              <div className="relative aspect-[3/4] max-h-[400px] overflow-hidden rounded-2xl bg-midnight-100">
                <img
                  src={selectedImage}
                  alt="Document preview"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            
            {/* Document Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-midnight-700 mb-3">
                What type of document is this?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {documentTypes.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => setDocumentType(type)}
                    className={`
                      p-3 rounded-xl border-2 transition-all text-left
                      ${documentType === type
                        ? 'border-sage-500 bg-sage-50'
                        : 'border-cream-200 hover:border-cream-300 bg-white'
                      }
                    `}
                  >
                    <span className="text-xl mb-1 block">{icon}</span>
                    <span className={`text-sm font-medium ${
                      documentType === type ? 'text-sage-700' : 'text-midnight-700'
                    }`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedFile(null);
                  setStep('select');
                }}
                className="btn-secondary flex-1"
              >
                Choose Different
              </button>
              <button
                onClick={processDocument}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                Analyze Document
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Step 3: Processing */}
        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            {/* Processing animation */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-sage-100" />
              {/* Spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sage-500 animate-spin" />
              {/* Inner content */}
              <div className="absolute inset-4 rounded-full bg-sage-50 flex items-center justify-center">
                <span className="text-4xl">{processingSteps[processingStep].icon}</span>
              </div>
            </div>
            
            {/* Current step */}
            <p className="text-xl font-medium text-midnight-800 mb-4">
              {processingSteps[processingStep].label}
            </p>
            
            {/* Progress dots */}
            <div className="flex justify-center gap-2">
              {processingSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx <= processingStep ? 'bg-sage-500' : 'bg-sage-200'
                  }`}
                />
              ))}
            </div>
            
            {/* Powered by badge */}
            <div className={`mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
              isRealAPI ? 'bg-sage-100 text-sage-700' : 'bg-cream-100 text-midnight-600'
            }`}>
              <Sparkles className={`w-4 h-4 ${isRealAPI ? 'text-sage-600' : 'text-midnight-400'}`} />
              {isRealAPI ? 'Powered by MedGemma API' : 'Demo Mode'}
            </div>
          </motion.div>
        )}
        
        {/* Step 4: Complete */}
        {step === 'complete' && processedDocument && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Success animation */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-sage-100 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-sage-600" />
              </motion.div>
              <h3 className="text-xl font-display font-semibold text-midnight-900">
                Document Analyzed Successfully
              </h3>
            </div>
            
            {/* Quick summary */}
            <div className="card mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-sage-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-midnight-900 truncate">
                    {processedDocument.title}
                  </h4>
                  <p className="text-sm text-midnight-500 mt-0.5">
                    {processedDocument.date} • {processedDocument.facility || 'Unknown facility'}
                  </p>
                  {processedDocument.extractedData.structuredData.labResults && (
                    <p className="text-sm text-midnight-600 mt-2">
                      {processedDocument.extractedData.structuredData.labResults.length} test results extracted
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action */}
            <button
              onClick={() => onComplete(processedDocument)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              View Full Analysis
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
