'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, isThisYear, isThisMonth } from 'date-fns';
import {
  FileText,
  Camera,
  Pill,
  Building2,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { useMedLensStore } from '@/lib/store';
import type { MedicalDocument, TimelineEvent } from '@/types/medical';

interface DocumentTimelineProps {
  onDocumentClick: (doc: MedicalDocument) => void;
}

export default function DocumentTimeline({ onDocumentClick }: DocumentTimelineProps) {
  const { documents, getTimeline } = useMedLensStore();
  const timeline = getTimeline();
  
  // Group timeline events by month/year
  const groupedTimeline = useMemo(() => {
    const groups: { label: string; events: TimelineEvent[] }[] = [];
    let currentGroup: { label: string; events: TimelineEvent[] } | null = null;
    
    timeline.forEach(event => {
      const date = parseISO(event.date);
      let label: string;
      
      if (isThisMonth(date)) {
        label = 'This Month';
      } else if (isThisYear(date)) {
        label = format(date, 'MMMM yyyy');
      } else {
        label = format(date, 'MMMM yyyy');
      }
      
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, events: [] };
        groups.push(currentGroup);
      }
      
      currentGroup.events.push(event);
    });
    
    return groups;
  }, [timeline]);
  
  const getDocumentById = (id: string) => documents.find(d => d.id === id);
  
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'lab_report': return <FileText className="w-5 h-5" />;
      case 'imaging': return <Camera className="w-5 h-5" />;
      case 'prescription': return <Pill className="w-5 h-5" />;
      case 'discharge_summary': return <Building2 className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };
  
  const getDocumentColor = (type: string) => {
    switch (type) {
      case 'lab_report': return 'bg-sage-100 text-sage-600';
      case 'imaging': return 'bg-sky-100 text-sky-600';
      case 'prescription': return 'bg-violet-100 text-violet-600';
      case 'discharge_summary': return 'bg-amber-100 text-amber-600';
      default: return 'bg-cream-100 text-midnight-600';
    }
  };

  if (timeline.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cream-100 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-midnight-400" />
        </div>
        <h3 className="text-lg font-display font-semibold text-midnight-900 mb-2">
          No Documents Yet
        </h3>
        <p className="text-midnight-500">
          Upload your first medical document to start building your health timeline.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-semibold text-midnight-900">Your Health Timeline</h2>
        <p className="text-midnight-500 mt-1">
          All your medical documents organized chronologically
        </p>
      </div>
      
      <div className="space-y-8">
        {groupedTimeline.map((group, groupIdx) => (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.1 }}
          >
            {/* Month/Year Label */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-cream-200" />
              <span className="text-sm font-medium text-midnight-500 px-3 py-1 rounded-full bg-cream-100">
                {group.label}
              </span>
              <div className="h-px flex-1 bg-cream-200" />
            </div>
            
            {/* Events */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-cream-200" />
              
              <div className="space-y-4">
                {group.events.map((event, eventIdx) => {
                  const doc = getDocumentById(event.documentId);
                  if (!doc) return null;
                  
                  return (
                    <motion.button
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: groupIdx * 0.1 + eventIdx * 0.05 }}
                      onClick={() => onDocumentClick(doc)}
                      className="w-full relative pl-16 group"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-4 top-4 w-5 h-5 rounded-full border-2 border-white shadow-sm ${getDocumentColor(event.type)}`}>
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-current" />
                        </div>
                      </div>
                      
                      {/* Card */}
                      <div className="card text-left group-hover:shadow-elevated transition-shadow">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getDocumentColor(event.type)}`}>
                            {getDocumentIcon(event.type)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium uppercase tracking-wide text-midnight-400">
                                {format(parseISO(event.date), 'MMM d')}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                event.type === 'lab_report' ? 'bg-sage-50 text-sage-700' :
                                event.type === 'imaging' ? 'bg-sky-50 text-sky-700' :
                                event.type === 'prescription' ? 'bg-violet-50 text-violet-700' :
                                'bg-cream-50 text-midnight-700'
                              }`}>
                                {event.type.replace('_', ' ')}
                              </span>
                            </div>
                            
                            <h4 className="font-medium text-midnight-900 mt-1 group-hover:text-sage-700 transition-colors">
                              {event.title}
                            </h4>
                            
                            <p className="text-sm text-midnight-500 mt-1">
                              {event.summary}
                            </p>
                            
                            {/* Highlights */}
                            {event.highlights && event.highlights.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {event.highlights.map((highlight, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700"
                                  >
                                    {highlight}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <ChevronRight className="w-5 h-5 text-midnight-300 group-hover:text-sage-500 transition-colors flex-shrink-0" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
