'use client';

import { useState } from 'react';
import { FileText, Bot, ChevronDown, MessageCircle, Play, Edit3, Save, X } from 'lucide-react';
import { SECTORS } from '@/lib/sectors';
import { SECTOR_PROMPTS, getSectorPrompt } from '@/lib/prompts';
import type { PromptNode } from '@/lib/prompts';

export default function AgentScriptsPage() {
  const [selectedSector, setSelectedSector] = useState('immobilier');
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editedScript, setEditedScript] = useState('');

  const sectorData = getSectorPrompt(selectedSector);
  const nodes = sectorData?.nodes || [];

  function startEdit(node: PromptNode) {
    setEditingNode(node.name);
    setEditedScript(node.script || node.instruction);
  }

  function cancelEdit() {
    setEditingNode(null);
    setEditedScript('');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700" />
                Scripts d&apos;appel
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Textes et scénarios pour vos agents vocaux par secteur
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Sector Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Secteur d&apos;activité
          </label>
          <div className="relative max-w-md">
            <select
              value={selectedSector}
              onChange={(e) => {
                setSelectedSector(e.target.value);
                setEditingNode(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none"
            >
              {SECTORS.filter(s => SECTOR_PROMPTS[s.value]).map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* System Prompt Preview */}
        {sectorData && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Bot className="w-4 h-4 text-gray-700" />
              System Prompt — {sectorData.label}
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {sectorData.system_prompt.slice(0, 500)}
                {sectorData.system_prompt.length > 500 ? '...' : ''}
              </pre>
            </div>
          </div>
        )}

        {/* Nodes / Scripts */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Nodes vocaux ({nodes.length})
        </h2>

        {nodes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun node défini pour ce secteur.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nodes.map((node, idx) => (
              <div
                key={node.name}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-sm font-bold text-gray-600">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{node.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{node.instruction.slice(0, 80)}...</p>
                    </div>
                  </div>
                  <button
                    onClick={() => editingNode === node.name ? cancelEdit() : startEdit(node)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title={editingNode === node.name ? 'Annuler' : 'Modifier'}
                  >
                    {editingNode === node.name ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Edit3 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {editingNode === node.name && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Script (texte exact prononcé par l&apos;agent)
                    </label>
                    <textarea
                      value={editedScript}
                      onChange={(e) => setEditedScript(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <div className="flex gap-2 mt-3">
                      <button className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
                        <Save className="w-3.5 h-3.5" />
                        Sauvegarder
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Script preview when not editing */}
                {editingNode !== node.name && node.script && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                    <div className="flex items-start gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600 italic">&quot;{node.script}&quot;</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Scenarios */}
        {sectorData?.quick_scenarios && sectorData.quick_scenarios.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-gray-700" />
              Scénarios de test
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sectorData.quick_scenarios.map((sc, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="font-medium text-sm text-gray-900 mb-1">{sc.label}</p>
                  <p className="text-xs text-gray-500 italic">&quot;{sc.message}&quot;</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
