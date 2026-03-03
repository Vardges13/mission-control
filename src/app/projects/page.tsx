'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  FolderKanban,
  Save,
  ListChecks,
  StickyNote,
  CalendarDays,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import type { Project, Milestone } from '@/lib/types';
import Modal from '@/components/Modal';

const STATUS_CONFIG: Record<
  Project['status'],
  { label: string; classes: string }
> = {
  active: {
    label: 'Активен',
    classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  paused: {
    label: 'Пауза',
    classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  completed: {
    label: 'Завершён',
    classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function calcProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.completed).length;
  return Math.round((done / milestones.length) * 100);
}

export default function ProjectsPage() {
  const [projects, setProjects, loading] = useLocalStorage<Project[]>(
    'mc-projects',
    '/mission-control/data/projects.json',
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // New project form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<Project['status']>('active');
  const [formNotes, setFormNotes] = useState('');

  // Inline editing state (per-project notes drafts)
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});

  // New milestone input per project
  const [milestoneInputs, setMilestoneInputs] = useState<
    Record<string, string>
  >({});

  const projectsList = useMemo(() => projects ?? [], [projects]);

  // ---- Handlers ----

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Initialize notes draft when expanding
      const proj = projectsList.find((p) => p.id === id);
      if (proj && notesDrafts[id] === undefined) {
        setNotesDrafts((prev) => ({ ...prev, [id]: proj.notes }));
      }
    }
  }

  function handleCreateProject() {
    if (!formTitle.trim()) return;

    const now = new Date().toISOString();
    const newProject: Project = {
      id: 'proj-' + Date.now(),
      title: formTitle.trim(),
      description: formDesc.trim(),
      status: formStatus,
      milestones: [],
      notes: formNotes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    setProjects([...projectsList, newProject]);
    setFormTitle('');
    setFormDesc('');
    setFormStatus('active');
    setFormNotes('');
    setModalOpen(false);
  }

  function handleDeleteProject(id: string) {
    setProjects(projectsList.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
    // Clean up drafts
    setNotesDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setMilestoneInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function toggleMilestone(projectId: string, milestoneId: string) {
    setProjects(
      projectsList.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          milestones: p.milestones.map((m) =>
            m.id === milestoneId ? { ...m, completed: !m.completed } : m,
          ),
        };
      }),
    );
  }

  function addMilestone(projectId: string) {
    const text = (milestoneInputs[projectId] ?? '').trim();
    if (!text) return;

    const newMilestone: Milestone = {
      id: 'ms-' + Date.now(),
      title: text,
      completed: false,
    };

    setProjects(
      projectsList.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          milestones: [...p.milestones, newMilestone],
        };
      }),
    );

    setMilestoneInputs((prev) => ({ ...prev, [projectId]: '' }));
  }

  function saveNotes(projectId: string) {
    const text = notesDrafts[projectId] ?? '';
    setProjects(
      projectsList.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          notes: text,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }

  // ---- Loading state ----

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-text-muted text-sm">
          Загрузка проектов...
        </div>
      </div>
    );
  }

  // ---- Render ----

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="text-accent" size={28} />
          <h1 className="text-2xl font-bold text-text-primary">Проекты</h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Новый проект
        </button>
      </div>

      {/* Empty state */}
      {projectsList.length === 0 && (
        <div className="text-center py-20 text-text-muted">
          <FolderKanban size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg">Нет проектов</p>
          <p className="text-sm mt-1">
            Создайте первый проект, нажав кнопку выше
          </p>
        </div>
      )}

      {/* Projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectsList.map((project) => {
          const progress = calcProgress(project.milestones);
          const completedCount = project.milestones.filter(
            (m) => m.completed,
          ).length;
          const totalCount = project.milestones.length;
          const isExpanded = expandedId === project.id;
          const statusCfg = STATUS_CONFIG[project.status];

          return (
            <div
              key={project.id}
              className={`bg-bg-surface border border-border rounded-xl transition-all duration-300 ${
                isExpanded
                  ? 'md:col-span-2 lg:col-span-3'
                  : 'hover:border-accent/30'
              }`}
            >
              {/* Card header — always visible, clickable */}
              <div
                className="p-5 cursor-pointer select-none"
                onClick={() => toggleExpand(project.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-text-primary truncate">
                        {project.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusCfg.classes}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2">
                      {project.description || 'Без описания'}
                    </p>
                  </div>
                  <button
                    className="mt-1 text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                    aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                  >
                    {isExpanded ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                    <span>Прогресс</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-bg-raised rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-purple-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Task counts */}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
                  <ListChecks size={14} />
                  <span>
                    {completedCount} / {totalCount} этапов
                  </span>
                </div>
              </div>

              {/* Expanded detail view */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded
                    ? 'max-h-[2000px] opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="border-t border-border px-5 pb-5 pt-4 space-y-5">
                  {/* Dates + delete row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} />
                        Создан: {formatDate(project.createdAt)}
                      </span>
                      <span>
                        Обновлён: {formatDate(project.updatedAt)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={14} />
                      Удалить проект
                    </button>
                  </div>

                  {/* Milestones */}
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-1.5">
                      <ListChecks size={16} className="text-accent" />
                      Этапы
                    </h4>

                    {project.milestones.length === 0 && (
                      <p className="text-xs text-text-muted mb-3">
                        Этапов пока нет. Добавьте первый этап ниже.
                      </p>
                    )}

                    <ul className="space-y-2 mb-3">
                      {project.milestones.map((ms) => (
                        <li key={ms.id} className="flex items-center gap-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMilestone(project.id, ms.id);
                            }}
                            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                              ms.completed
                                ? 'bg-accent border-accent text-white'
                                : 'border-border hover:border-accent/50 text-transparent'
                            }`}
                          >
                            <Check size={13} strokeWidth={3} />
                          </button>
                          <span
                            className={`text-sm transition-colors ${
                              ms.completed
                                ? 'line-through text-text-muted'
                                : 'text-text-primary'
                            }`}
                          >
                            {ms.title}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Add milestone input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Новый этап..."
                        value={milestoneInputs[project.id] ?? ''}
                        onChange={(e) =>
                          setMilestoneInputs((prev) => ({
                            ...prev,
                            [project.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addMilestone(project.id);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addMilestone(project.id);
                        }}
                        className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        Добавить
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-1.5">
                      <StickyNote size={16} className="text-accent" />
                      Заметки
                    </h4>
                    <textarea
                      rows={4}
                      value={notesDrafts[project.id] ?? project.notes}
                      onChange={(e) =>
                        setNotesDrafts((prev) => ({
                          ...prev,
                          [project.id]: e.target.value,
                        }))
                      }
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Заметки по проекту..."
                      className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-y min-h-[80px]"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveNotes(project.id);
                        }}
                        className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        <Save size={14} />
                        Сохранить
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New project modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Новый проект"
      >
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Название
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Название проекта"
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Описание
            </label>
            <textarea
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Краткое описание проекта"
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Статус
            </label>
            <select
              value={formStatus}
              onChange={(e) =>
                setFormStatus(e.target.value as Project['status'])
              }
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="active">Активен</option>
              <option value="paused">Пауза</option>
              <option value="completed">Завершён</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Заметки
            </label>
            <textarea
              rows={3}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Заметки (необязательно)"
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateProject}
              disabled={!formTitle.trim()}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={16} />
              Создать
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
