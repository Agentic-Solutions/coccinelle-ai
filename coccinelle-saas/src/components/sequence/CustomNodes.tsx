'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Phone, MessageSquare, Mail, Clock, GitBranch, CheckCircle,
  Calendar, BookOpen, Package, UserPlus, PhoneForwarded,
} from 'lucide-react';
import { NODE_CONFIG, type NodeData, type NodeType } from './types';

// ─── Type Node generique pour React Flow v12 ─────────────────────────────────

type SequenceNodeType = Node<NodeData>;

// ─── Icones par type ─────────────────────────────────────────────────────────

const NODE_ICONS: Record<NodeType, typeof Phone> = {
  call: Phone,
  sms: MessageSquare,
  email: Mail,
  condition: GitBranch,
  delay: Clock,
  rdv: Calendar,
  knowledge: BookOpen,
  products: Package,
  prospect: UserPlus,
  transfer: PhoneForwarded,
  end: CheckCircle,
};

// ─── Noeud standard ──────────────────────────────────────────────────────────

function BaseNode({ data, selected }: { data: NodeData; selected?: boolean }) {
  const config = NODE_CONFIG[data.type];
  const Icon = NODE_ICONS[data.type];
  const isCondition = data.type === 'condition';
  const isEnd = data.type === 'end';

  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border transition-shadow
        ${selected ? 'border-gray-900 shadow-md ring-1 ring-gray-900/10' : 'border-gray-200'}
      `}
      style={{ minWidth: 200, maxWidth: 240 }}
    >
      {/* Handle entree (haut) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !-top-1.5"
      />

      {/* Barre de couleur */}
      <div className={`h-1.5 rounded-t-lg ${config.color}`} />

      {/* Contenu */}
      <div className="px-3 py-2.5">
        {/* Titre */}
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 shrink-0 ${config.iconColor}`} />
          <span className="text-sm font-semibold text-gray-900 truncate">
            {data.label}
          </span>
        </div>

        {/* Description / Contenu */}
        {data.content && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {data.content}
          </p>
        )}

        {/* Badge delay */}
        {data.type === 'delay' && data.delayDuration && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            {data.delayDuration}
          </span>
        )}

        {/* Badge condition */}
        {isCondition && data.condition && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
            <GitBranch className="w-3 h-3" />
            {data.condition}
          </span>
        )}

        {/* Badge tool */}
        {data.tool && (
          <span className="inline-block mt-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full font-mono">
            {data.tool}
          </span>
        )}
      </div>

      {/* Handles sortie */}
      {isCondition ? (
        <>
          {/* Sortie OUI (gauche) */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-white !-bottom-1.5"
            style={{ left: '30%' }}
          />
          <span
            className="absolute text-[9px] font-bold text-green-600 pointer-events-none select-none"
            style={{ bottom: -16, left: '25%' }}
          >
            OUI
          </span>
          {/* Sortie NON (droite) */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-white !-bottom-1.5"
            style={{ left: '70%' }}
          />
          <span
            className="absolute text-[9px] font-bold text-red-600 pointer-events-none select-none"
            style={{ bottom: -16, left: '66%' }}
          >
            NON
          </span>
        </>
      ) : !isEnd ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !-bottom-1.5"
        />
      ) : null}
    </div>
  );
}

// ─── Wrapper pour extraire data depuis NodeProps ─────────────────────────────

function NodeWrapper(props: NodeProps) {
  return <BaseNode data={props.data as unknown as NodeData} selected={props.selected} />;
}

// ─── Exports memoisés ────────────────────────────────────────────────────────

export const CallNode = memo(NodeWrapper);
export const SmsNode = memo(NodeWrapper);
export const EmailNode = memo(NodeWrapper);
export const ConditionNode = memo(NodeWrapper);
export const DelayNode = memo(NodeWrapper);
export const RdvNode = memo(NodeWrapper);
export const KnowledgeNode = memo(NodeWrapper);
export const ProductsNode = memo(NodeWrapper);
export const ProspectNode = memo(NodeWrapper);
export const TransferNode = memo(NodeWrapper);
export const EndNode = memo(NodeWrapper);

CallNode.displayName = 'CallNode';
SmsNode.displayName = 'SmsNode';
EmailNode.displayName = 'EmailNode';
ConditionNode.displayName = 'ConditionNode';
DelayNode.displayName = 'DelayNode';
RdvNode.displayName = 'RdvNode';
KnowledgeNode.displayName = 'KnowledgeNode';
ProductsNode.displayName = 'ProductsNode';
ProspectNode.displayName = 'ProspectNode';
TransferNode.displayName = 'TransferNode';
EndNode.displayName = 'EndNode';

// ─── Map pour React Flow ─────────────────────────────────────────────────────

export const nodeTypes = {
  call: CallNode,
  sms: SmsNode,
  email: EmailNode,
  condition: ConditionNode,
  delay: DelayNode,
  rdv: RdvNode,
  knowledge: KnowledgeNode,
  products: ProductsNode,
  prospect: ProspectNode,
  transfer: TransferNode,
  end: EndNode,
};
