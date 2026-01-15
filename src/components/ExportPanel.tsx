'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Share2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileJson,
  Table,
  Heart,
} from 'lucide-react';
import { useMedLensStore } from '@/lib/store';
import {
  printPDF,
  downloadHTML,
  copySummaryToClipboard,
  generateTextSummary,
} from '@/lib/pdf-export';
import { downloadFHIR, exportToCSV } from '@/lib/fhir-export';

interface ExportPanelProps {
  onClose: () => void;
}

export default function ExportPanel({ onClose }: ExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState({
    includeTrends: true,
    includeVoiceNotes: true,
    includeOriginalImage: false,
  });
  
  const { documents, getLabTrends } = useMedLensStore();
  const labTrends = getLabTrends();

  const handlePrint = () => {
    printPDF(documents, labTrends, undefined, options);
  };

  const handleDownload = () => {
    downloadHTML(documents, labTrends, undefined, options);
  };

  const handleCopy = async () => {
    try {
      await copySummaryToClipboard(documents, labTrends);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    const summary = generateTextSummary(documents, labTrends);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Health Summary Report',
          text: summary,
        });
      } catch (error) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-midnight-900/30 backdrop-blur-sm" />
      
      {/* Panel */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-elevated overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-cream-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-sage-600" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-midnight-900">Export Report</h2>
              <p className="text-sm text-midnight-500">Share your health summary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-cream-100 transition-colors"
          >
            <X className="w-5 h-5 text-midnight-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Summary */}
          <div className="p-4 rounded-xl bg-cream-50 border border-cream-100">
            <p className="text-sm text-midnight-600">
              <span className="font-medium">{documents.length}</span> document{documents.length !== 1 ? 's' : ''} • 
              <span className="font-medium ml-1">{labTrends.length}</span> tracked test{labTrends.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {/* Export Options */}
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-cream-50 transition-colors"
          >
            <span className="text-sm font-medium text-midnight-700">Export Options</span>
            {showOptions ? (
              <ChevronUp className="w-4 h-4 text-midnight-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-midnight-400" />
            )}
          </button>
          
          {showOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 pl-2"
            >
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-cream-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeTrends}
                  onChange={(e) => setOptions({ ...options, includeTrends: e.target.checked })}
                  className="w-4 h-4 rounded border-cream-300 text-sage-600 focus:ring-sage-500"
                />
                <span className="text-sm text-midnight-700">Include lab value trends</span>
              </label>
              
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-cream-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeVoiceNotes}
                  onChange={(e) => setOptions({ ...options, includeVoiceNotes: e.target.checked })}
                  className="w-4 h-4 rounded border-cream-300 text-sage-600 focus:ring-sage-500"
                />
                <span className="text-sm text-midnight-700">Include voice notes</span>
              </label>
            </motion.div>
          )}
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-cream-200 hover:border-sage-300 hover:bg-sage-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-cream-100 group-hover:bg-sage-100 flex items-center justify-center transition-colors">
                <Printer className="w-5 h-5 text-midnight-600 group-hover:text-sage-600" />
              </div>
              <span className="text-sm font-medium text-midnight-700">Print PDF</span>
            </button>
            
            <button
              onClick={handleDownload}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-cream-200 hover:border-sage-300 hover:bg-sage-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-cream-100 group-hover:bg-sage-100 flex items-center justify-center transition-colors">
                <Download className="w-5 h-5 text-midnight-600 group-hover:text-sage-600" />
              </div>
              <span className="text-sm font-medium text-midnight-700">Download</span>
            </button>
            
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-cream-200 hover:border-sage-300 hover:bg-sage-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-cream-100 group-hover:bg-sage-100 flex items-center justify-center transition-colors">
                {copied ? (
                  <Check className="w-5 h-5 text-sage-600" />
                ) : (
                  <Copy className="w-5 h-5 text-midnight-600 group-hover:text-sage-600" />
                )}
              </div>
              <span className="text-sm font-medium text-midnight-700">
                {copied ? 'Copied!' : 'Copy Text'}
              </span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-cream-200 hover:border-sage-300 hover:bg-sage-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-cream-100 group-hover:bg-sage-100 flex items-center justify-center transition-colors">
                <Share2 className="w-5 h-5 text-midnight-600 group-hover:text-sage-600" />
              </div>
              <span className="text-sm font-medium text-midnight-700">Share</span>
            </button>
          </div>
          
          {/* Healthcare Export Options */}
          <div className="pt-4 border-t border-cream-100">
            <p className="text-xs text-midnight-500 mb-3 font-medium">Healthcare Formats</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => downloadFHIR(documents)}
                className="flex items-center gap-2 p-3 rounded-xl border border-cream-200 hover:border-violet-300 hover:bg-violet-50 transition-all group"
              >
                <FileJson className="w-5 h-5 text-violet-500" />
                <div className="text-left">
                  <span className="text-sm font-medium text-midnight-700 block">FHIR Export</span>
                  <span className="text-xs text-midnight-400">HL7 Standard</span>
                </div>
              </button>
              
              <button
                onClick={() => exportToCSV(documents)}
                className="flex items-center gap-2 p-3 rounded-xl border border-cream-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
              >
                <Table className="w-5 h-5 text-emerald-500" />
                <div className="text-left">
                  <span className="text-sm font-medium text-midnight-700 block">CSV Export</span>
                  <span className="text-xs text-midnight-400">Spreadsheet</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-cream-100 bg-cream-50">
          <p className="text-xs text-midnight-500 text-center">
            Your health data stays private. Reports are generated locally on your device.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
