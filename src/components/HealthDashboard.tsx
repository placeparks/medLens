'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  FileText,
  ChevronRight,
  Activity,
  Heart,
  Droplets,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useMedLensStore } from '@/lib/store';
import { LAB_CATEGORY_INFO } from '@/lib/medgemma';
import type { MedicalDocument, LabTrend, LabCategory } from '@/types/medical';

interface HealthDashboardProps {
  onDocumentClick: (doc: MedicalDocument) => void;
  onUploadClick: () => void;
}

export default function HealthDashboard({ onDocumentClick, onUploadClick }: HealthDashboardProps) {
  const { documents, alerts, getLabTrends, getTimeline } = useMedLensStore();
  
  const labTrends = getLabTrends();
  const timeline = getTimeline();
  const activeAlerts = alerts.filter(a => !a.dismissed);
  
  // Group trends by category
  const trendsByCategory = useMemo(() => {
    const grouped: Record<LabCategory, LabTrend[]> = {} as any;
    labTrends.forEach(trend => {
      if (!grouped[trend.category]) {
        grouped[trend.category] = [];
      }
      grouped[trend.category].push(trend);
    });
    return grouped;
  }, [labTrends]);
  
  // Get featured trends (ones with multiple data points)
  const featuredTrends = useMemo(() => {
    return labTrends
      .filter(t => t.dataPoints.length >= 2)
      .slice(0, 3);
  }, [labTrends]);
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const getTrendIcon = (status: LabTrend['currentStatus']) => {
    switch (status) {
      case 'improving': return <TrendingDown className="w-4 h-4 text-sage-500" />;
      case 'worsening': return <TrendingUp className="w-4 h-4 text-coral-500" />;
      case 'stable': return <Minus className="w-4 h-4 text-midnight-400" />;
      default: return <Activity className="w-4 h-4 text-midnight-400" />;
    }
  };
  
  const getTrendColor = (status: LabTrend['currentStatus']) => {
    switch (status) {
      case 'improving': return '#617361';
      case 'worsening': return '#ee5f45';
      case 'stable': return '#5d727e';
      default: return '#5d727e';
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome Banner */}
      {documents.length === 0 ? (
        <motion.div variants={itemVariants} className="card-elevated text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-display font-semibold text-midnight-900 mb-2">
            Welcome to MedLens
          </h2>
          <p className="text-midnight-500 max-w-md mx-auto mb-6">
            Start by uploading your first medical document. We'll help you understand it and track your health over time.
          </p>
          <button onClick={onUploadClick} className="btn-primary">
            <Plus className="w-5 h-5 mr-2 inline" />
            Upload Your First Document
          </button>
        </motion.div>
      ) : (
        <>
          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-sage-600" />
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold text-midnight-900">{documents.length}</p>
                  <p className="text-sm text-midnight-500">Documents</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold text-midnight-900">{labTrends.length}</p>
                  <p className="text-sm text-midnight-500">Tracked Tests</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-sage-600" />
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold text-midnight-900">
                    {labTrends.filter(t => t.currentStatus === 'improving').length}
                  </p>
                  <p className="text-sm text-midnight-500">Improving</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeAlerts.length > 0 ? 'bg-coral-100' : 'bg-cream-100'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${
                    activeAlerts.length > 0 ? 'text-coral-600' : 'text-midnight-400'
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold text-midnight-900">{activeAlerts.length}</p>
                  <p className="text-sm text-midnight-500">Alerts</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Featured Trends */}
          {featuredTrends.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-semibold text-midnight-900">Your Health Trends</h3>
                <button className="btn-ghost text-sm flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                {featuredTrends.map((trend, idx) => (
                  <TrendCard key={trend.testName} trend={trend} delay={idx * 0.1} />
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Recent Documents */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-semibold text-midnight-900">Recent Documents</h3>
              <button onClick={onUploadClick} className="btn-ghost text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add New
              </button>
            </div>
            
            <div className="space-y-3">
              {documents.slice(0, 5).map((doc, idx) => (
                <motion.button
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onDocumentClick(doc)}
                  className="card w-full text-left hover:shadow-elevated transition-shadow group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      doc.type === 'lab_report' ? 'bg-sage-100' :
                      doc.type === 'imaging' ? 'bg-sky-100' :
                      doc.type === 'prescription' ? 'bg-violet-100' :
                      'bg-cream-100'
                    }`}>
                      <FileText className={`w-6 h-6 ${
                        doc.type === 'lab_report' ? 'text-sage-600' :
                        doc.type === 'imaging' ? 'text-sky-600' :
                        doc.type === 'prescription' ? 'text-violet-600' :
                        'text-midnight-500'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-midnight-900 truncate group-hover:text-sage-700 transition-colors">
                        {doc.title}
                      </h4>
                      <p className="text-sm text-midnight-500 mt-0.5">
                        {format(parseISO(doc.date), 'MMM d, yyyy')}
                        {doc.facility && ` • ${doc.facility}`}
                      </p>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-midnight-300 group-hover:text-sage-500 transition-colors" />
                  </div>
                  
                  {/* Lab results summary */}
                  {doc.extractedData.structuredData.labResults && doc.extractedData.structuredData.labResults.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-cream-100 flex flex-wrap gap-2">
                      {doc.extractedData.structuredData.labResults.slice(0, 4).map(result => (
                        <span
                          key={result.id}
                          className={`text-xs px-2 py-1 rounded-lg ${
                            result.status === 'normal' ? 'bg-sage-50 text-sage-700' :
                            result.status === 'critical' ? 'bg-coral-50 text-coral-700' :
                            'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {result.testName.split(',')[0]}
                          {result.status !== 'normal' && (
                            <span className="ml-1">
                              {result.status === 'high' ? '↑' : result.status === 'low' ? '↓' : '!'}
                            </span>
                          )}
                        </span>
                      ))}
                      {doc.extractedData.structuredData.labResults.length > 4 && (
                        <span className="text-xs px-2 py-1 rounded-lg bg-cream-100 text-midnight-500">
                          +{doc.extractedData.structuredData.labResults.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

// Trend Card Component
function TrendCard({ trend, delay }: { trend: LabTrend; delay: number }) {
  const chartData = trend.dataPoints.map(dp => ({
    date: format(parseISO(dp.date), 'MMM d'),
    value: dp.value,
  }));
  
  const latestValue = trend.dataPoints[trend.dataPoints.length - 1];
  const previousValue = trend.dataPoints.length > 1 ? trend.dataPoints[trend.dataPoints.length - 2] : null;
  
  const percentChange = previousValue 
    ? ((latestValue.value - previousValue.value) / previousValue.value * 100).toFixed(1)
    : null;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'improving': return 'text-sage-600';
      case 'worsening': return 'text-coral-600';
      default: return 'text-midnight-500';
    }
  };
  
  const getLineColor = (status: string) => {
    switch (status) {
      case 'improving': return '#617361';
      case 'worsening': return '#ee5f45';
      default: return '#5d727e';
    }
  };
  
  const getGradientId = `gradient-${trend.testName.replace(/\s/g, '-')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-midnight-500">{trend.testName}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-display font-semibold text-midnight-900">
              {latestValue.value}
            </span>
            <span className="text-sm text-midnight-500">{trend.unit}</span>
          </div>
        </div>
        {percentChange && (
          <div className={`flex items-center gap-1 text-sm font-medium ${getStatusColor(trend.currentStatus)}`}>
            {trend.currentStatus === 'improving' && <TrendingDown className="w-4 h-4" />}
            {trend.currentStatus === 'worsening' && <TrendingUp className="w-4 h-4" />}
            {trend.currentStatus === 'stable' && <Minus className="w-4 h-4" />}
            {Math.abs(parseFloat(percentChange))}%
          </div>
        )}
      </div>
      
      {/* Mini Chart */}
      <div className="h-24 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={getGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={getLineColor(trend.currentStatus)} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={getLineColor(trend.currentStatus)} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={getLineColor(trend.currentStatus)}
              strokeWidth={2}
              fill={`url(#${getGradientId})`}
            />
            {trend.referenceRange && (
              <>
                <ReferenceLine
                  y={trend.referenceRange.high}
                  stroke="#e3e7e3"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  y={trend.referenceRange.low}
                  stroke="#e3e7e3"
                  strokeDasharray="4 4"
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Reference range indicator */}
      {trend.referenceRange && (
        <p className="text-xs text-midnight-400 mt-2">
          Normal: {trend.referenceRange.low} - {trend.referenceRange.high} {trend.unit}
        </p>
      )}
    </motion.div>
  );
}
