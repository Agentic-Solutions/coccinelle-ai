'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  ConnectionLineType,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type OnConnect,
  type ReactFlowInstance,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Phone, MessageSquare, Mail, Clock, GitBranch, CheckCircle,
  Calendar, BookOpen, Package, UserPlus, PhoneForwarded,
  GripVertical, X, Trash2, Download, Upload, Sparkles, Copy, Loader2,
} from 'lucide-react';
import { nodeTypes } from './CustomNodes';
import {
  NODE_CONFIG, NODE_PALETTE, PALETTE_CATEGORIES,
  DELAY_OPTIONS, CONDITION_OPTIONS,
  type NodeType, type NodeData,
} from './types';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

// No extra CSS needed — group-hover handles visibility via Tailwind

// ─── Icones ──────────────────────────────────────────────────────────────────

const ICONS: Record<NodeType, typeof Phone> = {
  call: Phone, sms: MessageSquare, email: Mail,
  condition: GitBranch, delay: Clock,
  rdv: Calendar, knowledge: BookOpen, products: Package,
  prospect: UserPlus, transfer: PhoneForwarded, end: CheckCircle,
};

// ─── Edge supprimable (✕ au survol) ─────────────────────────────────────────

function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style, markerEnd, label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        {/* Wrapper with group-hover — hovering near midpoint reveals ✕ */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group"
        >
          <div className="relative flex flex-col items-center p-2">
            {/* Label OUI/NON */}
            {label && (
              <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/90 shadow-sm border border-gray-200 mb-1">
                {label}
              </div>
            )}
            {/* Bouton ✕ */}
            <button
              className="w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-400 hover:bg-red-50 hover:border-red-300 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                const event = new CustomEvent('deleteEdge', { detail: id });
                window.dispatchEvent(event);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { deletable: DeletableEdge };

// ─── Secteurs pour generation IA ────────────────────────────────────────────

const AI_SECTORS = [
  { value: 'garage', label: 'Garage automobile' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'immobilier', label: 'Agence immobiliere' },
  { value: 'medical', label: 'Cabinet medical' },
  { value: 'veterinaire', label: 'Veterinaire' },
  { value: 'comptable', label: 'Cabinet comptable' },
  { value: 'notaire', label: 'Etude notariale' },
  { value: 'coiffure', label: 'Salon de coiffure' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'ia_voix', label: 'Agence IA / Tech' },
];

const AI_EXAMPLES = [
  'Sequence de qualification et prise de RDV pour un garage automobile',
  'Relance par SMS et email apres un appel sans reponse',
  'Accueil, identification du besoin, transfert si complexe',
  'Prise de RDV avec verification des disponibilites et confirmation SMS',
];

// ─── Séquence par défaut ─────────────────────────────────────────────────────

const defaultNodes: Node[] = [
  {
    id: '1', type: 'call', position: { x: 250, y: 50 },
    data: { type: 'call', label: 'Accueil', content: "Accueillez l'appelant et identifiez son besoin." } as NodeData,
  },
  {
    id: '2', type: 'condition', position: { x: 250, y: 200 },
    data: { type: 'condition', label: 'Interesse ?', content: '', condition: 'interested' } as NodeData,
  },
  {
    id: '3', type: 'call', position: { x: 80, y: 380 },
    data: { type: 'call', label: 'Qualification', content: 'Approfondissez le besoin et collectez les informations.' } as NodeData,
  },
  {
    id: '4', type: 'sms', position: { x: 420, y: 380 },
    data: { type: 'sms', label: 'SMS Relance', content: 'Envoyez un SMS de rappel.' } as NodeData,
  },
  {
    id: '5', type: 'rdv', position: { x: 80, y: 540 },
    data: { type: 'rdv', label: 'Prise de RDV', content: 'Proposez un creneau.', tool: 'check_availability' } as NodeData,
  },
  {
    id: '6', type: 'end', position: { x: 250, y: 700 },
    data: { type: 'end', label: 'Fin', content: 'Remerciez et terminez.' } as NodeData,
  },
];

const defaultEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: { strokeWidth: 2, stroke: '#94a3b8' } },
  { id: 'e2-3', source: '2', target: '3', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: { strokeWidth: 2, stroke: '#22c55e' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
  { id: 'e2-4', source: '2', target: '4', type: 'deletable', sourceHandle: 'no', label: 'NON', style: { strokeWidth: 2, stroke: '#ef4444' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  { id: 'e3-5', source: '3', target: '5', type: 'deletable', animated: true, style: { strokeWidth: 2, stroke: '#94a3b8' } },
  { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: { strokeWidth: 2, stroke: '#94a3b8' } },
  { id: 'e4-6', source: '4', target: '6', type: 'deletable', animated: true, style: { strokeWidth: 2, stroke: '#94a3b8' } },
];

// ─── Composant principal ─────────────────────────────────────────────────────

export default function SequenceFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const nextId = useRef(10);

  // AI generation state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSector, setAiSector] = useState('garage');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // ─── Supprimer une connexion (edge) ──────────────────────────────────────

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  // Listen for deleteEdge custom events from DeletableEdge buttons
  useEffect(() => {
    const handler = (e: Event) => deleteEdge((e as CustomEvent).detail);
    window.addEventListener('deleteEdge', handler);
    return () => window.removeEventListener('deleteEdge', handler);
  }, [deleteEdge]);

  // ─── Load template from localStorage (set by configuration page) ──────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('voixia_flow_template');
      if (stored) {
        const template = JSON.parse(stored);
        if (template.nodes?.length) {
          setNodes(template.nodes);
          setEdges(template.edges || []);
          setSelectedNode(null);
          const maxId = template.nodes.reduce((max: number, n: { id: string }) => {
            const num = parseInt(n.id.replace(/\D/g, ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 10);
          nextId.current = maxId + 1;
        }
        localStorage.removeItem('voixia_flow_template');
      }
    } catch { /* ignore invalid data */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Connexions ────────────────────────────────────────────────────────────

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const isFromCondition = nodes.find(n => n.id === params.source)?.type === 'condition';
      const isYes = params.sourceHandle === 'yes';
      const isNo = params.sourceHandle === 'no';

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'deletable',
            animated: !isFromCondition,
            label: isYes ? 'OUI' : isNo ? 'NON' : undefined,
            style: {
              strokeWidth: 2,
              stroke: isYes ? '#22c55e' : isNo ? '#ef4444' : '#94a3b8',
            },
            markerEnd: isFromCondition
              ? { type: MarkerType.ArrowClosed, color: isYes ? '#22c55e' : '#ef4444' }
              : undefined,
          },
          eds
        )
      );
    },
    [nodes, setEdges]
  );

  // ─── Selection ─────────────────────────────────────────────────────────────

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // ─── Drag & Drop depuis palette ────────────────────────────────────────────

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const config = NODE_CONFIG[type];
      const palette = NODE_PALETTE.find(p => p.type === type);
      const id = `node_${nextId.current++}`;

      const newNode: Node = {
        id,
        type,
        position,
        data: {
          type,
          label: config.label,
          content: palette?.description || '',
          tool: palette?.tool,
          delayDuration: type === 'delay' ? '1h' : undefined,
          condition: type === 'condition' ? 'interested' : undefined,
        } as NodeData,
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
    },
    [reactFlowInstance, setNodes]
  );

  // ─── Supprimer noeud ───────────────────────────────────────────────────────

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  // ─── Mettre a jour un noeud ────────────────────────────────────────────────

  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
        )
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId
          ? { ...prev, data: { ...prev.data, ...updates } }
          : prev
      );
    },
    [setNodes]
  );

  // ─── MiniMap couleurs ──────────────────────────────────────────────────────

  // ─── Dupliquer un noeud ───────────────────────────────────────────────────

  const duplicateNode = useCallback(
    (node: Node) => {
      const id = `node_${nextId.current++}`;
      const newNode: Node = {
        ...node,
        id,
        position: { x: node.position.x + 40, y: node.position.y + 60 },
        selected: false,
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
    },
    [setNodes]
  );

  // ─── Export JSON ─────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sequence_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  // ─── Import JSON ─────────────────────────────────────────────────────────

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          if (json.nodes && json.edges) {
            setNodes(json.nodes);
            setEdges(json.edges);
            setSelectedNode(null);
            // Update nextId to avoid collisions
            const maxId = json.nodes.reduce((max: number, n: Node) => {
              const num = parseInt(n.id.replace(/\D/g, ''), 10);
              return isNaN(num) ? max : Math.max(max, num);
            }, 10);
            nextId.current = maxId + 1;
          }
        } catch {
          alert('Fichier JSON invalide.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges]);

  // ─── Generation IA ───────────────────────────────────────────────────────

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');

    const systemPrompt = `Tu es un expert en creation de sequences omnicanal pour un CRM avec IA vocale.
Tu generes des sequences au format JSON strictement valide.
Le secteur est : ${aiSector}.

Reponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte avant ou apres) :
{
  "nodes": [
    { "id": "1", "type": "call", "position": { "x": 250, "y": 50 }, "data": { "type": "call", "label": "Accueil", "content": "Script vocal ici" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "type": "deletable", "animated": true, "style": { "strokeWidth": 2, "stroke": "#94a3b8" } }
  ]
}

Types disponibles : call, sms, email, condition, delay, rdv, knowledge, products, prospect, transfer, end.
Pour les conditions, ajoute sourceHandle "yes" ou "no" aux edges, label "OUI"/"NON", stroke vert/rouge.
Pour les nodes condition, ajoute "condition" dans data (ex: "interested", "answered").
Pour les nodes delay, ajoute "delayDuration" dans data (ex: "1h", "30s", "1d").
Pour les nodes action (rdv, knowledge, products, prospect, transfer), ajoute "tool" dans data.
Positionne les nodes verticalement (y incremente de ~150px) et horizontalement pour les branches.
Genere entre 4 et 10 nodes selon la complexite demandee.`;

    try {
      const res = await fetch(buildApiUrl('/api/v1/ai/simulate'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          system_prompt: systemPrompt,
          messages: [{ role: 'user', content: aiPrompt }],
          llm_provider: 'anthropic',
        }),
      });

      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const result = await res.json();
      const reply = result.reply || result.message || '';

      // Extract JSON from the reply (handle potential markdown wrapping)
      let jsonStr = reply;
      const jsonMatch = reply.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      // Also try to find raw JSON object
      const rawMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (rawMatch) jsonStr = rawMatch[0];

      const parsed = JSON.parse(jsonStr);
      if (parsed.nodes && parsed.edges) {
        setNodes(parsed.nodes);
        setEdges(parsed.edges);
        setSelectedNode(null);
        const maxId = parsed.nodes.reduce((max: number, n: { id: string }) => {
          const num = parseInt(n.id.replace(/\D/g, ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 10);
        nextId.current = maxId + 1;
        setAiModalOpen(false);
        setAiPrompt('');
      } else {
        setAiError('Format de reponse inattendu. Reessayez.');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erreur de generation');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiSector, setNodes, setEdges]);

  // ─── MiniMap couleurs ────────────────────────────────────────────────────

  const miniMapNodeColor = useCallback((node: Node) => {
    const type = node.type as NodeType;
    const colorMap: Record<string, string> = {
      call: '#1f2937', sms: '#2563eb', email: '#7c3aed',
      condition: '#f59e0b', delay: '#f97316',
      rdv: '#16a34a', knowledge: '#0d9488', products: '#4f46e5',
      prospect: '#db2777', transfer: '#dc2626', end: '#9ca3af',
    };
    return colorMap[type] || '#6b7280';
  }, []);

  return (
    <div className="flex h-[calc(100vh-180px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ─── Palette gauche ─────────────────────────────────────────────── */}
      <div className={`${paletteOpen ? 'w-56' : 'w-0'} transition-all duration-200 border-r border-gray-200 bg-gray-50 overflow-y-auto overflow-x-hidden`}>
        {paletteOpen && (
          <div className="p-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Glisser-deposer
            </p>
            {PALETTE_CATEGORIES.map((cat) => (
              <div key={cat} className="mb-3">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 px-1">
                  {cat}
                </p>
                <div className="space-y-1">
                  {NODE_PALETTE.filter((p) => p.category === cat).map((item) => {
                    const Icon = ICONS[item.type];
                    const config = NODE_CONFIG[item.type];
                    return (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/reactflow', item.type);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing bg-white border border-gray-200 ${config.bgHover} transition-colors group`}
                      >
                        <GripVertical className="w-3 h-3 text-gray-300 group-hover:text-gray-400 shrink-0" />
                        <div className={`w-1 h-5 rounded-full ${config.color} shrink-0`} />
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${config.iconColor}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{item.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Canvas React Flow ──────────────────────────────────────────── */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            type: 'deletable',
            animated: true,
            style: { strokeWidth: 2, stroke: '#94a3b8' },
          }}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ strokeWidth: 2, stroke: '#94a3b8' }}
          snapToGrid
          snapGrid={[16, 16]}
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
          <Controls
            showInteractive={false}
            className="!bg-white !border-gray-200 !shadow-sm !rounded-lg"
          />
          <MiniMap
            nodeColor={miniMapNodeColor}
            className="!bg-gray-50 !border-gray-200 !rounded-lg !shadow-sm"
            maskColor="rgba(0,0,0,0.08)"
            style={{ width: 140, height: 100 }}
          />

          {/* Toggle palette */}
          <Panel position="top-left">
            <button
              onClick={() => setPaletteOpen(!paletteOpen)}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {paletteOpen ? 'Masquer' : 'Palette'}
            </button>
          </Panel>

          {/* Toolbar droite */}
          <Panel position="top-right">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExport}
                title="Exporter JSON"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter
              </button>
              <button
                onClick={handleImport}
                title="Importer JSON"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Upload className="w-3.5 h-3.5" />
                Importer
              </button>
              <button
                onClick={() => setAiModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900 text-white rounded-lg shadow-sm text-xs font-medium hover:bg-gray-800"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generer avec l&apos;IA
              </button>
            </div>
          </Panel>
        </ReactFlow>

        {/* ─── Modal IA ─────────────────────────────────────────────── */}
        {aiModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gray-700" />
                  <h3 className="text-sm font-semibold text-gray-900">Generer une sequence avec l&apos;IA</h3>
                </div>
                <button onClick={() => setAiModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Secteur */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Secteur</label>
                <select
                  value={aiSector}
                  onChange={(e) => setAiSector(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  {AI_SECTORS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Decrivez la sequence souhaitee</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  placeholder="Ex: Sequence de qualification et prise de RDV pour un garage..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
                />
              </div>

              {/* Exemples rapides */}
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase mb-1.5">Exemples</p>
                <div className="flex flex-wrap gap-1.5">
                  {AI_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setAiPrompt(ex)}
                      className="px-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {ex.length > 50 ? ex.slice(0, 50) + '...' : ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {aiError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{aiError}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setAiModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAiGenerate}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Panneau proprietes (droite) ────────────────────────────────── */}
      {selectedNode && (
        <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto">
          <NodeEditor
            node={selectedNode}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
            onDuplicate={duplicateNode}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Panneau d'edition du noeud selectionne ──────────────────────────────────

function NodeEditor({
  node,
  onUpdate,
  onDelete,
  onDuplicate,
  onClose,
}: {
  node: Node;
  onUpdate: (id: string, updates: Partial<NodeData>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (node: Node) => void;
  onClose: () => void;
}) {
  const data = node.data as NodeData;
  const config = NODE_CONFIG[data.type];
  const Icon = ICONS[data.type];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-6 rounded-full ${config.color}`} />
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
          <span className="text-sm font-semibold text-gray-900">{config.label}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Titre */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
        />
      </div>

      {/* Contenu / Script */}
      {data.type !== 'end' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {data.type === 'call' ? 'Script vocal' : data.type === 'sms' ? 'Message SMS' : data.type === 'email' ? 'Corps email' : 'Description'}
          </label>
          <textarea
            value={data.content}
            onChange={(e) => onUpdate(node.id, { content: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none"
          />
        </div>
      )}

      {/* Delai */}
      {data.type === 'delay' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Duree</label>
          <select
            value={data.delayDuration || '1h'}
            onChange={(e) => onUpdate(node.id, { delayDuration: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {DELAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Condition */}
      {data.type === 'condition' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type de condition</label>
          <select
            value={data.condition || 'interested'}
            onChange={(e) => onUpdate(node.id, { condition: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {CONDITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400 mt-1">2 sorties : OUI (vert) / NON (rouge)</p>
        </div>
      )}

      {/* Tool badge */}
      {data.tool && (
        <div className="px-3 py-2 bg-gray-50 rounded-lg">
          <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Outil connecte</p>
          <p className="text-xs font-mono text-gray-700">{data.tool}</p>
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 border-t border-gray-100 space-y-1">
        <button
          onClick={() => onDuplicate(node)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Copy className="w-4 h-4" />
          Dupliquer ce noeud
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Supprimer ce noeud
        </button>
      </div>

      {/* Info node ID */}
      <p className="text-[10px] text-gray-300 font-mono">ID: {node.id}</p>
    </div>
  );
}
