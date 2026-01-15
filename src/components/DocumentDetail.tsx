'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  Share2,
  Download,
  Mic,
  Plus,
  Sparkles,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { useMedLensStore } from '@/lib/store';
import { LAB_CATEGORY_INFO } from '@/lib/medgemma';
import VoiceRecorder from './VoiceRecorder';
import ExportPanel from './ExportPanel';
import type { MedicalDocument, LabResult, LabCategory, VoiceNote } from '@/types/medical';

interface DocumentDetailProps {
  document: MedicalDocument;
  onBack: () => void;
}

export default function DocumentDetail({ document, onBack }: DocumentDetailProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<LabCategory>>(
    new Set<LabCategory>(['metabolic', 'lipid'])
  );
  const [showExplanation, setShowExplanation] = useState(true);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);

  const { documents, updateDocument, getLabTrends } = useMedLensStore();
  const labTrends = getLabTrends();

  const labResults = document.extractedData.structuredData.labResults || [];
  const medications = document.extractedData.structuredData.medications || [];
  const recommendations = document.extractedData.structuredData.recommendations || [];

  // Group lab results by category
  const labsByCategory = labResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<LabCategory, LabResult[]>);

  const toggleCategory = (category: LabCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusIcon = (status: LabResult['status']) => {
    switch (status) {
      case 'normal': return <CheckCircle className="w-4 h-4 text-sage-500" />;
      case 'high': return <TrendingUp className="w-4 h-4 text-amber-500" />;
      case 'low': return <TrendingDown className="w-4 h-4 text-sky-500" />;
      case 'critical': return <AlertCircle className="w-4 h-4 text-coral-500" />;
      default: return <Info className="w-4 h-4 text-midnight-400" />;
    }
  };

  const getStatusBadge = (status: LabResult['status']) => {
    switch (status) {
      case 'normal': return 'badge-normal';
      case 'high': return 'badge-warning';
      case 'low': return 'badge-info';
      case 'critical': return 'badge-critical';
      default: return 'badge';
    }
  };

  const getTrendForTest = (testName: string) => {
    return labTrends.find(t => t.testName.toLowerCase() === testName.toLowerCase());
  };

  const handleSaveVoiceNote = (voiceNote: VoiceNote) => {
    updateDocument(document.id, {
      voiceNotes: [...document.voiceNotes, voiceNote],
    });
    setShowVoiceRecorder(false);
  };

  const handleDeleteVoiceNote = (noteId: string) => {
    updateDocument(document.id, {
      voiceNotes: document.voiceNotes.filter(n => n.id !== noteId),
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-cream-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-midnight-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-semibold text-midnight-900">
            {document.title}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-midnight-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(parseISO(document.date), 'MMMM d, yyyy')}
            </span>
            {document.facility && (
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {document.facility}
              </span>
            )}
            {document.provider && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {document.provider}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportPanel(true)}
            className="btn-ghost p-2"
            title="Export / Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowExportPanel(true)}
            className="btn-ghost p-2"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Explanation */}
          {document.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-midnight-900">AI Explanation</h3>
                    <p className="text-sm text-midnight-500">Plain-language summary of your results</p>
                  </div>
                </div>
                {showExplanation ? (
                  <ChevronUp className="w-5 h-5 text-midnight-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-midnight-400" />
                )}
              </button>

              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-cream-100"
                  >
                    <div className="prose prose-sm max-w-none text-midnight-700 whitespace-pre-line">
                      {document.explanation}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Lab Results by Category */}
          {Object.entries(labsByCategory).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold text-midnight-900">Lab Results</h3>

              {Object.entries(labsByCategory).map(([category, results], idx) => {
                const categoryInfo = LAB_CATEGORY_INFO[category as LabCategory];
                const isExpanded = expandedCategories.has(category as LabCategory);
                const abnormalCount = results.filter(r => r.status !== 'normal').length;

                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="card"
                  >
                    <button
                      onClick={() => toggleCategory(category as LabCategory)}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{categoryInfo.icon}</span>
                        <div className="text-left">
                          <h4 className="font-medium text-midnight-900">{categoryInfo.name}</h4>
                          <p className="text-sm text-midnight-500">
                            {results.length} tests
                            {abnormalCount > 0 && (
                              <span className="ml-2 text-amber-600">
                                {abnormalCount} abnormal
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-midnight-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-midnight-400" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-3"
                        >
                          {results.map((result) => {
                            const trend = getTrendForTest(result.testName);

                            return (
                              <div
                                key={result.id}
                                className={`p-4 rounded-xl border ${result.status === 'normal' ? 'border-cream-200 bg-cream-50/50' :
                                    result.status === 'critical' ? 'border-coral-200 bg-coral-50/50' :
                                      'border-amber-200 bg-amber-50/50'
                                  }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(result.status)}
                                      <span className="font-medium text-midnight-900">
                                        {result.testName}
                                      </span>
                                    </div>

                                    <div className="mt-2 flex items-baseline gap-2">
                                      <span className="text-2xl font-display font-semibold text-midnight-900">
                                        {result.value}
                                      </span>
                                      <span className="text-sm text-midnight-500">{result.unit}</span>
                                    </div>

                                    {result.referenceRange && (
                                      <p className="text-sm text-midnight-500 mt-1">
                                        Reference: {result.referenceRange.text || `${result.referenceRange.low} - ${result.referenceRange.high}`}
                                      </p>
                                    )}
                                  </div>

                                  <span className={getStatusBadge(result.status)}>
                                    {result.status}
                                  </span>
                                </div>

                                {/* Mini trend chart */}
                                {trend && trend.dataPoints.length > 1 && (
                                  <div className="mt-4 pt-4 border-t border-cream-200">
                                    <p className="text-xs text-midnight-500 mb-2">Historical Trend</p>
                                    <div className="h-16">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trend.dataPoints.map(dp => ({
                                          date: format(parseISO(dp.date), 'MM/dd'),
                                          value: dp.value,
                                        }))}>
                                          <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke={result.status === 'normal' ? '#617361' : '#ee5f45'}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                          />
                                          {trend.referenceRange && (
                                            <ReferenceArea
                                              y1={trend.referenceRange.low}
                                              y2={trend.referenceRange.high}
                                              fill="#617361"
                                              fillOpacity={0.1}
                                            />
                                          )}
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Medications */}
          {medications.length > 0 && (
            <div className="card">
              <h3 className="font-medium text-midnight-900 mb-4">Medications</h3>
              <div className="space-y-3">
                {medications.map((med, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                    <p className="font-medium text-violet-900">{med.name}</p>
                    {med.dosage && (
                      <p className="text-sm text-violet-700 mt-1">
                        {med.dosage} {med.frequency && `• ${med.frequency}`}
                      </p>
                    )}
                    {med.instructions && (
                      <p className="text-sm text-violet-600 mt-1">{med.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <h3 className="font-medium text-midnight-900 mb-4">Quick Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-cream-100">
                <span className="text-sm text-midnight-500">Total Tests</span>
                <span className="font-medium text-midnight-900">{labResults.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-cream-100">
                <span className="text-sm text-midnight-500">Normal</span>
                <span className="font-medium text-sage-600">
                  {labResults.filter(r => r.status === 'normal').length}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-cream-100">
                <span className="text-sm text-midnight-500">Abnormal</span>
                <span className="font-medium text-amber-600">
                  {labResults.filter(r => r.status !== 'normal' && r.status !== 'critical').length}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-midnight-500">Critical</span>
                <span className="font-medium text-coral-600">
                  {labResults.filter(r => r.status === 'critical').length}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="card">
              <h3 className="font-medium text-midnight-900 mb-4">Recommendations</h3>
              <ul className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-midnight-700">
                    <span className="text-sage-500 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Voice Notes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-midnight-900">Voice Notes</h3>
              <button
                onClick={() => setShowVoiceRecorder(true)}
                className="btn-ghost p-2"
                title="Add voice note"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {document.voiceNotes.length === 0 ? (
              <button
                onClick={() => setShowVoiceRecorder(true)}
                className="w-full p-4 rounded-xl border-2 border-dashed border-cream-200 hover:border-sage-300 transition-colors text-center group"
              >
                <Mic className="w-6 h-6 mx-auto mb-2 text-midnight-400 group-hover:text-sage-500" />
                <p className="text-sm text-midnight-500 group-hover:text-sage-600">
                  Add a voice note
                </p>
              </button>
            ) : (
              <div className="space-y-3">
                {document.voiceNotes.map(note => (
                  <div key={note.id} className="p-3 rounded-xl bg-cream-50 border border-cream-100">
                    <p className="text-sm text-midnight-700 mb-2">
                      "{note.transcript}"
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-midnight-400">
                        {format(parseISO(note.createdAt), 'MMM d, yyyy')}
                      </span>
                      <div className="flex items-center gap-1">
                        {note.audioUrl && (
                          <button
                            onClick={() => {
                              const audio = new Audio(note.audioUrl);
                              audio.play();
                              setPlayingNoteId(note.id);
                              audio.onended = () => setPlayingNoteId(null);
                            }}
                            className="p-1.5 rounded-lg hover:bg-cream-100"
                            title="Play audio"
                          >
                            <Play className="w-3.5 h-3.5 text-midnight-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteVoiceNote(note.id)}
                          className="p-1.5 rounded-lg hover:bg-coral-50"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-midnight-400 hover:text-coral-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  className="w-full p-2 rounded-lg text-sm text-sage-600 hover:bg-sage-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add another note
                </button>
              </div>
            )}
          </div>

          {/* Original Document */}
          {document.originalImage && (
            <div className="card">
              <h3 className="font-medium text-midnight-900 mb-4">Original Document</h3>
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-midnight-100">
                <img
                  src={document.originalImage}
                  alt="Original document"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Recorder Modal */}
      <AnimatePresence>
        {showVoiceRecorder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowVoiceRecorder(false)}
          >
            <div className="absolute inset-0 bg-midnight-900/30 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-elevated overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <VoiceRecorder
                onSave={handleSaveVoiceNote}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Panel */}
      <AnimatePresence>
        {showExportPanel && (
          <ExportPanel onClose={() => setShowExportPanel(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
