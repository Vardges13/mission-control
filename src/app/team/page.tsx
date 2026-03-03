'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  Users,
  Crown,
  Bot,
  Cpu,
  Settings,
  Trash2,
  Edit3,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import type { TeamData, Agent } from '@/lib/types';
import Modal from '@/components/Modal';

/* ──────────────────────────── helpers ──────────────────────────── */

const STATUS_CFG: Record<Agent['status'], { dot: string; label: string; text: string }> = {
  online:  { dot: 'bg-emerald-500', label: 'Онлайн',    text: 'text-emerald-400' },
  idle:    { dot: 'bg-amber-500',   label: 'Ожидание',  text: 'text-amber-400' },
  offline: { dot: 'bg-red-500',     label: 'Оффлайн',   text: 'text-red-400' },
};

/** Map first-letter of name to avatar colour pair. */
function avatarColors(agent: Agent, kind: 'owner' | 'main' | 'sub'): { bg: string; text: string } {
  if (kind === 'owner') return { bg: 'bg-blue-500/20',   text: 'text-blue-400' };
  if (kind === 'main')  return { bg: 'bg-purple-500/20', text: 'text-purple-400' };

  const map: Record<string, { bg: string; text: string }> = {
    'Ч': { bg: 'bg-orange-500/20',  text: 'text-orange-400' },
    'В': { bg: 'bg-violet-500/20',  text: 'text-violet-400' },
    'Р': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    'М': { bg: 'bg-pink-500/20',    text: 'text-pink-400' },
    'Е': { bg: 'bg-cyan-500/20',    text: 'text-cyan-400' },
    'Л': { bg: 'bg-yellow-500/20',  text: 'text-yellow-400' },
  };

  const letter = agent.name.charAt(0).toUpperCase();
  return map[letter] ?? { bg: 'bg-slate-500/20', text: 'text-slate-400' };
}

/* ──────────────────────────── page ──────────────────────────── */

export default function TeamPage() {
  const [team, setTeam, loading] = useLocalStorage<TeamData>('mc-team', '/mission-control/data/team.json');

  // Expanded detail for an agent
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add-agent modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPlatform, setFormPlatform] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<Agent['status']>('idle');
  const [formCaps, setFormCaps] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState<Agent['status']>('online');

  const owner = team?.owner ?? null;
  const mainAgent = team?.mainAgent ?? null;
  const subAgents = useMemo(() => team?.subAgents ?? [], [team]);

  /* ── mutations ─────────────────────────────────────────────── */

  function updateAgent(id: string, patch: Partial<Agent>) {
    if (!team) return;
    if (team.owner.id === id) {
      setTeam({ ...team, owner: { ...team.owner, ...patch } as TeamData['owner'] });
    } else if (team.mainAgent.id === id) {
      setTeam({ ...team, mainAgent: { ...team.mainAgent, ...patch } });
    } else {
      setTeam({
        ...team,
        subAgents: team.subAgents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      });
    }
  }

  function deleteAgent(id: string) {
    if (!team) return;
    // Only sub-agents can be deleted
    if (team.owner.id === id || team.mainAgent.id === id) return;
    setTeam({ ...team, subAgents: team.subAgents.filter((a) => a.id !== id) });
    if (expandedId === id) setExpandedId(null);
  }

  function handleCreateAgent() {
    if (!formName.trim() || !team) return;

    const newAgent: Agent = {
      id: 'agent-' + Date.now(),
      name: formName.trim(),
      role: formRole.trim(),
      platform: formPlatform.trim() || undefined,
      model: formModel.trim() || undefined,
      description: formDesc.trim(),
      status: formStatus,
      currentTask: '',
      capabilities: formCaps
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      stats: { tasksCompleted: 0 },
    };

    setTeam({ ...team, subAgents: [...team.subAgents, newAgent] });
    resetForm();
    setModalOpen(false);
  }

  function resetForm() {
    setFormName('');
    setFormRole('');
    setFormPlatform('');
    setFormModel('');
    setFormDesc('');
    setFormStatus('idle');
    setFormCaps('');
  }

  function startInlineEdit(agent: Agent) {
    setEditingId(agent.id);
    setEditRole(agent.role);
    setEditStatus(agent.status);
  }

  function saveInlineEdit(id: string) {
    updateAgent(id, { role: editRole, status: editStatus });
    setEditingId(null);
  }

  function cancelInlineEdit() {
    setEditingId(null);
  }


  /* ── loading ──────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-text-muted text-sm">Загрузка команды...</div>
      </div>
    );
  }

  /* ── render helpers ────────────────────────────────────────── */

  function renderStatusBadge(status: Agent['status']) {
    const cfg = STATUS_CFG[status];
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
        <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
      </span>
    );
  }

  function renderAvatar(agent: Agent, kind: 'owner' | 'main' | 'sub', size: 'lg' | 'sm') {
    const colors = avatarColors(agent, kind);
    const letter = agent.name.charAt(0).toUpperCase();
    const sz = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-10 h-10 text-base';
    return (
      <div className={`${sz} rounded-full ${colors.bg} ${colors.text} flex items-center justify-center font-bold flex-shrink-0`}>
        {letter}
      </div>
    );
  }

  function renderRoleBadge(role: string) {
    return (
      <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full font-medium">
        {role}
      </span>
    );
  }

  /* ── detail panel (expanded) ───────────────────────────────── */

  function renderDetail(agent: Agent, kind: 'owner' | 'main' | 'sub') {
    const isEditing = editingId === agent.id;
    const canDelete = kind === 'sub';

    return (
      <div className="mt-4 border-t border-border pt-4 space-y-4 animate-fade-in">
        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-1">Описание</h4>
          <p className="text-sm text-text-secondary">{agent.description || 'Нет описания'}</p>
        </div>

        {/* Capabilities */}
        {agent.capabilities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-2">Возможности</h4>
            <div className="flex flex-wrap gap-1.5">
              {agent.capabilities.map((cap) => (
                <span key={cap} className="bg-accent/10 text-accent text-xs px-2 py-1 rounded-full">
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-2">Статистика</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(agent.stats).map(([key, value]) => (
              <div key={key} className="bg-bg-raised border border-border rounded-lg px-3 py-2">
                <div className="text-xs text-text-muted mb-0.5">{key}</div>
                <div className="text-sm font-semibold text-text-primary">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Current task */}
        {agent.currentTask && (
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-1">Текущая задача</h4>
            <p className="text-sm text-text-secondary">{agent.currentTask}</p>
          </div>
        )}

        {/* Inline edit */}
        {isEditing ? (
          <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Роль</label>
              <input
                type="text"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Статус</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Agent['status'])}
                className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="online">Онлайн</option>
                <option value="idle">Ожидание</option>
                <option value="offline">Оффлайн</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelInlineEdit}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => saveInlineEdit(agent.id)}
                className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                startInlineEdit(agent);
              }}
              className="text-text-muted hover:text-text-primary text-xs flex items-center gap-1 transition-colors"
            >
              <Edit3 size={13} />
              Редактировать
            </button>
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAgent(agent.id);
                }}
                className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 size={13} />
                Удалить
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── card renderer ─────────────────────────────────────────── */

  function renderAgentCard(agent: Agent, kind: 'owner' | 'main' | 'sub') {
    const isExpanded = expandedId === agent.id;
    const icon =
      kind === 'owner' ? <Crown size={16} className="text-amber-400" /> :
      kind === 'main'  ? <Bot size={16} className="text-purple-400" /> :
                         <Cpu size={14} className="text-text-muted" />;

    return (
      <div
        key={agent.id}
        className={`bg-bg-surface border border-border rounded-xl transition-all duration-300 cursor-pointer ${
          isExpanded ? 'ring-1 ring-accent/40 border-accent/30' : 'hover:border-accent/30'
        }`}
        onClick={() => setExpandedId(isExpanded ? null : agent.id)}
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            {renderAvatar(agent, kind, kind === 'sub' ? 'sm' : 'lg')}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {icon}
                <h3 className="text-base font-semibold text-text-primary truncate">{agent.name}</h3>
                {renderRoleBadge(agent.role)}
              </div>

              {agent.platform && (
                <p className="text-xs text-text-muted mb-1">
                  <Settings size={11} className="inline mr-1 -mt-0.5" />
                  {agent.platform}
                  {agent.model ? ` / ${agent.model}` : ''}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2">
                {renderStatusBadge(agent.status)}
              </div>

              {agent.currentTask && (
                <p className="text-xs text-text-secondary mt-2 line-clamp-1">
                  <Activity size={11} className="inline mr-1 -mt-0.5" />
                  {agent.currentTask}
                </p>
              )}
            </div>

            <button
              className={`mt-1 text-text-muted hover:text-text-primary transition-transform flex-shrink-0 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Expanded detail */}
          {isExpanded && renderDetail(agent, kind)}
        </div>
      </div>
    );
  }

  /* ──────────────────────────── JSX ──────────────────────────── */

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Mission banner ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-indigo-600/90 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-40" />
        <div className="relative">
          <p className="text-white/90 text-lg sm:text-xl font-medium leading-relaxed max-w-3xl">
            &laquo;Построить систему AI-агентов, которые автоматизируют бизнес-процессы и заменяют сотрудников. Бизнес на автомате.&raquo;
          </p>
        </div>
      </div>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-accent" size={28} />
          <h1 className="text-2xl font-bold text-text-primary">Команда</h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Добавить агента
        </button>
      </div>

      {/* ── Hierarchy ────────────────────────────────────────── */}
      <div className="space-y-0">
        {/* ─ Owner level ─ */}
        {owner && (
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              {renderAgentCard(owner, 'owner')}
            </div>
          </div>
        )}

        {/* Connector line */}
        <div className="flex justify-center">
          <div className="w-px h-8 bg-border" />
        </div>

        {/* ─ Main agent level ─ */}
        {mainAgent && (
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              {renderAgentCard(mainAgent, 'main')}
            </div>
          </div>
        )}

        {/* Connector line with branch */}
        {subAgents.length > 0 && (
          <div className="flex justify-center">
            <div className="w-px h-8 bg-border" />
          </div>
        )}

        {/* Horizontal connector */}
        {subAgents.length > 0 && (
          <div className="flex justify-center px-4">
            <div className="w-full max-w-5xl h-px bg-border" />
          </div>
        )}

        {/* ─ Sub-agents grid ─ */}
        {subAgents.length > 0 && (
          <div className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subAgents.map((agent) => (
                <div key={agent.id}>
                  {/* Mini connector from top */}
                  <div className="flex justify-center mb-2">
                    <div className="w-px h-4 bg-border" />
                  </div>
                  {renderAgentCard(agent, 'sub')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for sub-agents */}
        {subAgents.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <Cpu size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg">Нет суб-агентов</p>
            <p className="text-sm mt-1">Добавьте первого агента, нажав кнопку выше</p>
          </div>
        )}
      </div>

      {/* ── Add agent modal ──────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="Добавить агента">
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Имя</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Имя агента"
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Роль</label>
            <input
              type="text"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              placeholder="Роль агента"
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Платформа</label>
            <input
              type="text"
              value={formPlatform}
              onChange={(e) => setFormPlatform(e.target.value)}
              placeholder="Cloud / Local / ..."
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Модель</label>
            <input
              type="text"
              value={formModel}
              onChange={(e) => setFormModel(e.target.value)}
              placeholder="Claude / GPT-4o / ..."
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Описание</label>
            <textarea
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Описание агента"
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Статус</label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as Agent['status'])}
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="online">Онлайн</option>
              <option value="idle">Ожидание</option>
              <option value="offline">Оффлайн</option>
            </select>
          </div>

          {/* Capabilities */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Возможности (через запятую)</label>
            <input
              type="text"
              value={formCaps}
              onChange={(e) => setFormCaps(e.target.value)}
              placeholder="Python, API, DevOps, ..."
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setModalOpen(false); resetForm(); }}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateAgent}
              disabled={!formName.trim()}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={16} />
              Добавить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
