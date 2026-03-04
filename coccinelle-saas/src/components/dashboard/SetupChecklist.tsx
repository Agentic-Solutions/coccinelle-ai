'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Loader2
} from 'lucide-react';

interface Step {
  id: string;
  title: string;
  completed: boolean;
  href: string | null;
}

interface ChecklistData {
  steps: Step[];
  completed: number;
  total: number;
  progress_percent: number;
  setup_completed: boolean;
}

export default function SetupChecklist() {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem('setup_checklist_dismissed');
    if (d === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    const fetchChecklist = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/onboarding/checklist`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setChecklist(data.checklist);
            // Collapse by default if more than half done
            if (data.checklist.progress_percent >= 50) {
              setExpanded(false);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching checklist:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('setup_checklist_dismissed', 'true');
  };

  if (dismissed || loading) return null;
  if (!checklist || checklist.setup_completed) return null;

  const { steps, completed, total, progress_percent } = checklist;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm">Configuration initiale</h3>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                  {completed}/{total}
                </span>
              </div>
              {/* Barre de progression */}
              <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gray-900 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress_percent}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              aria-label={expanded ? 'Reduire' : 'Developper'}
            >
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div className="p-4 space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                step.completed ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {step.completed ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
              <span className={`text-sm flex-1 ${step.completed ? 'text-green-800 line-through' : 'text-gray-700 font-medium'}`}>
                {step.title}
              </span>
              {!step.completed && step.href && (
                <Link href={step.href}>
                  <span className="text-xs font-medium text-gray-900 hover:text-gray-700 underline whitespace-nowrap">
                    Configurer
                  </span>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
