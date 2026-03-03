'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Pin, PinOff, Trash2, ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import type { Memory } from '@/lib/types';
import Modal from '@/components/Modal';

const RUSSIAN_MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

type MemoryType = Memory['type'];
type FilterType = MemoryType | 'all';

const TYPE_CONFIG: Record<MemoryType, { label: string; bg: string; text: string }> = {
  work: { label: 'Работа', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  system: { label: 'Система', bg: 'bg-slate-500/10', text: 'text-slate-400' },
  achievement: { label: 'Достижение', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  idea: { label: 'Идея', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  research: { label: 'Исследование', bg: 'bg-amber-500/10', text: 'text-amber-400' },
};

const FILTER_BUTTONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'work', label: 'Работа' },
  { key: 'system', label: 'Система' },
  { key: 'achievement', label: 'Достижение' },
  { key: 'idea', label: 'Идея' },
  { key: 'research', label: 'Исследование' },
];

function formatRussianDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = RUSSIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

export default function MemoryPage() {
  const [memories, setMemories, loading] = useLocalStorage<Memory[]>(
    'mc-memories',
    '/mission-control/data/memories.json'
  );

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);

  // New memory form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryType>('work');
  const [newTags, setNewTags] = useState('');

  const allMemories = useMemo(() => memories ?? [], [memories]);

  const filtered = useMemo(() => {
    return allMemories.filter((m) => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchContent = m.content.toLowerCase().includes(q);
        const matchTags = m.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchContent && !matchTags) return false;
      }
      return true;
    });
  }, [allMemories, typeFilter, search]);

  const pinnedMemories = useMemo(() => {
    return filtered
      .filter((m) => m.pinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filtered]);

  const unpinnedMemories = useMemo(() => {
    return filtered.filter((m) => !m.pinned);
  }, [filtered]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Memory[]> = {};
    for (const m of unpinnedMemories) {
      const key = getDateKey(m.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    // Sort each group by time descending
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // Sort date keys descending
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((key) => ({
      dateKey: key,
      dateLabel: formatRussianDate(groups[key][0].createdAt),
      memories: groups[key],
    }));
  }, [unpinnedMemories]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePin(id: string) {
    if (!memories) return;
    const updated = memories.map((m) =>
      m.id === id ? { ...m, pinned: !m.pinned } : m
    );
    setMemories(updated);
  }

  function deleteMemory(id: string) {
    if (!memories) return;
    const updated = memories.filter((m) => m.id !== id);
    setMemories(updated);
  }

  function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) return;

    const mem: Memory = {
      id: 'mem-' + Date.now(),
      title: newTitle.trim(),
      content: newContent.trim(),
      type: newType,
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      pinned: false,
      createdAt: new Date().toISOString(),
    };

    setMemories([...(memories ?? []), mem]);
    setNewTitle('');
    setNewContent('');
    setNewType('work');
    setNewTags('');
    setModalOpen(false);
  }

  function renderTypeBadge(type: MemoryType) {
    const cfg = TYPE_CONFIG[type];
    return (
      <span className={`${cfg.bg} ${cfg.text} text-xs px-2 py-0.5 rounded-full font-medium`}>
        {cfg.label}
      </span>
    );
  }

  function renderMemoryCard(mem: Memory) {
    const isExpanded = expandedIds.has(mem.id);

    return (
      <div key={mem.id} className="relative flex gap-4 group">
        {/* Timeline dot */}
        <div className="flex flex-col items-center flex-shrink-0 w-4 pt-1">
          <div className="w-3 h-3 rounded-full bg-accent border-2 border-bg-surface z-10" />
          <div className="w-px flex-1 bg-border" />
        </div>

        {/* Card */}
        <div className="flex-1 bg-bg-surface border border-border rounded-lg p-4 mb-3 hover:border-accent/30 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <button
                  onClick={() => toggleExpand(mem.id)}
                  className="text-text-muted hover:text-text-primary transition-colors"
                  aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <span className="text-text-muted text-sm font-mono">
                  {formatTime(mem.createdAt)}
                </span>
                {renderTypeBadge(mem.type)}
                <h3 className="text-text-primary font-medium text-sm truncate">
                  {mem.title}
                </h3>
              </div>

              {/* Content */}
              <div className="ml-6">
                {isExpanded ? (
                  <p className="text-text-secondary text-sm whitespace-pre-wrap break-words">
                    {mem.content}
                  </p>
                ) : (
                  <p className="text-text-secondary text-sm">
                    {truncate(mem.content, 100)}
                  </p>
                )}

                {/* Tags */}
                {mem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {mem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-bg-raised text-text-muted text-xs px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => togglePin(mem.id)}
                className="p-1.5 rounded-md hover:bg-bg-raised text-text-muted hover:text-accent transition-colors"
                title={mem.pinned ? 'Открепить' : 'Закрепить'}
              >
                {mem.pinned ? <PinOff size={15} /> : <Pin size={15} />}
              </button>
              <button
                onClick={() => deleteMemory(mem.id)}
                className="p-1.5 rounded-md hover:bg-bg-raised text-text-muted hover:text-red-400 transition-colors"
                title="Удалить"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-text-muted text-sm">Загрузка памяти...</div>
      </div>
    );
  }

  const inputClass =
    'w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="text-accent" size={24} />
          <h1 className="text-2xl font-bold text-text-primary">Память</h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Новая запись
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
        <input
          type="text"
          placeholder="Поиск по памяти..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} pl-9`}
        />
      </div>

      {/* Type filter buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_BUTTONS.map((fb) => (
          <button
            key={fb.key}
            onClick={() => setTypeFilter(fb.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === fb.key
                ? 'bg-accent text-white'
                : 'bg-bg-surface text-text-secondary hover:text-text-primary border border-border hover:border-accent/30'
            }`}
          >
            {fb.label}
          </button>
        ))}
      </div>

      {/* Pinned section */}
      {pinnedMemories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pin size={14} />
            Закреплённые
          </h2>
          <div>
            {pinnedMemories.map((mem) => renderMemoryCard(mem))}
          </div>
        </div>
      )}

      {/* Timeline grouped by date */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-6">
          {groupedByDate.map((group) => (
            <div key={group.dateKey}>
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                {group.dateLabel}
              </h2>
              <div>
                {group.memories.map((mem) => renderMemoryCard(mem))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        pinnedMemories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Brain size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">Записей не найдено</p>
            <p className="text-sm">
              {search || typeFilter !== 'all'
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'Нажмите "Новая запись", чтобы добавить первую запись'}
            </p>
          </div>
        )
      )}

      {/* New Memory Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Новая запись">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Заголовок
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Название записи"
              className={inputClass}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Содержание
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Текст записи..."
              rows={5}
              className={`${inputClass} resize-y`}
            />
          </div>

          {/* Type select */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Тип
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as MemoryType)}
              className={inputClass}
            >
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Теги (через запятую)
            </label>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="тег1, тег2, тег3"
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || !newContent.trim()}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Создать
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
