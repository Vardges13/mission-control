'use client';

import { useState, useRef, useCallback, useMemo, DragEvent } from 'react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import type { Task, ColumnId } from '@/lib/types';
import Modal from '@/components/Modal';
import {
  Plus,
  Filter,
  GripVertical,
  Pencil,
  Trash2,
  Tag,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

/* ─── Column definitions ──────────────────────────────────────────── */

interface ColumnDef {
  id: ColumnId;
  label: string;
  colorClass: string;
  icon: React.ReactNode;
}

const COLUMNS: ColumnDef[] = [
  { id: 'backlog', label: 'Бэклог', colorClass: 'text-text-secondary', icon: <Layers size={16} /> },
  { id: 'in-progress', label: 'В работе', colorClass: 'text-blue-400', icon: <Clock size={16} /> },
  { id: 'review', label: 'Ревью', colorClass: 'text-amber-400', icon: <AlertTriangle size={16} /> },
  { id: 'done', label: 'Готово', colorClass: 'text-emerald-400', icon: <CheckCircle2 size={16} /> },
];

/* ─── Priority helpers ────────────────────────────────────────────── */

const PRIORITY_CONFIG = {
  high: { label: 'Высокий', dot: 'bg-red-500', ring: 'ring-red-500/30' },
  medium: { label: 'Средний', dot: 'bg-amber-500', ring: 'ring-amber-500/30' },
  low: { label: 'Низкий', dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
} as const;

/* ─── Assignee helpers ────────────────────────────────────────────── */

const ASSIGNEE_CONFIG = {
  V: { label: 'Вардгес', short: 'V', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  B: { label: 'Bond', short: 'B', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
} as const;

/* ─── Empty task template ─────────────────────────────────────────── */

function emptyTask(column: ColumnId = 'backlog'): Omit<Task, 'id' | 'createdAt'> {
  return {
    title: '',
    description: '',
    assignee: 'V',
    priority: 'medium',
    column,
    tags: [],
  };
}

/* ─── Input class constant ────────────────────────────────────────── */

const INPUT_CLS =
  'w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent';

const BTN_PRIMARY =
  'bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors';

const BTN_SECONDARY =
  'px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-raised transition-colors';

const BTN_DANGER =
  'bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm transition-colors';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Page Component                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

export default function TasksPage() {
  const [tasks, setTasks, loading] = useLocalStorage<Task[]>(
    'mc-tasks',
    '/mission-control/data/tasks.json',
  );

  /* ─── Filters ───────────────────────────────────────────────────── */
  const [filterAssignee, setFilterAssignee] = useState<'all' | 'V' | 'B'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  /* ─── Modals ────────────────────────────────────────────────────── */
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editMode, setEditMode] = useState(false);

  /* ─── Drag state ────────────────────────────────────────────────── */
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);

  /* ─── Create form state ─────────────────────────────────────────── */
  const [newTask, setNewTask] = useState(emptyTask());
  const [newTagsStr, setNewTagsStr] = useState('');

  /* ─── Edit form state ───────────────────────────────────────────── */
  const [editForm, setEditForm] = useState(emptyTask());
  const [editTagsStr, setEditTagsStr] = useState('');

  const dragImageRef = useRef<HTMLDivElement | null>(null);

  /* ─── Derived: filtered tasks per column ────────────────────────── */
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterAssignee, filterPriority]);

  const tasksByColumn = useMemo(() => {
    const map: Record<ColumnId, Task[]> = {
      backlog: [],
      'in-progress': [],
      review: [],
      done: [],
    };
    filteredTasks.forEach((t) => map[t.column].push(t));
    return map;
  }, [filteredTasks]);

  const totalCount = tasks?.length ?? 0;

  /* ─── Handlers: CRUD ────────────────────────────────────────────── */

  const handleCreate = useCallback(() => {
    if (!tasks || !newTask.title.trim()) return;
    const task: Task = {
      ...newTask,
      id: 'task-' + Date.now(),
      tags: newTagsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, task]);
    setNewTask(emptyTask());
    setNewTagsStr('');
    setCreateOpen(false);
  }, [tasks, setTasks, newTask, newTagsStr]);

  const handleUpdate = useCallback(() => {
    if (!tasks || !detailTask) return;
    const updated: Task = {
      ...detailTask,
      ...editForm,
      tags: editTagsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
    setDetailTask(updated);
    setEditMode(false);
  }, [tasks, setTasks, detailTask, editForm, editTagsStr]);

  const handleDelete = useCallback(() => {
    if (!tasks || !detailTask) return;
    setTasks(tasks.filter((t) => t.id !== detailTask.id));
    setDetailTask(null);
    setEditMode(false);
  }, [tasks, setTasks, detailTask]);

  const openDetail = useCallback((task: Task) => {
    setDetailTask(task);
    setEditMode(false);
    setEditForm({
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      priority: task.priority,
      column: task.column,
      tags: task.tags,
    });
    setEditTagsStr(task.tags.join(', '));
  }, []);

  const closeDetail = useCallback(() => {
    setDetailTask(null);
    setEditMode(false);
  }, []);

  /* ─── Handlers: Drag & Drop ─────────────────────────────────────── */

  const onDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', taskId);

      // Semi-transparent ghost
      if (dragImageRef.current) {
        dragImageRef.current.style.display = 'block';
        const card = e.currentTarget;
        dragImageRef.current.textContent =
          tasks?.find((t) => t.id === taskId)?.title ?? '';
        dragImageRef.current.style.width = card.offsetWidth + 'px';
        e.dataTransfer.setDragImage(dragImageRef.current, 20, 20);
        // Hide again after a tick so it doesn't show in layout
        requestAnimationFrame(() => {
          if (dragImageRef.current) dragImageRef.current.style.display = 'none';
        });
      }
    },
    [tasks],
  );

  const onDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, []);

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, colId: ColumnId) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn(colId);
    },
    [],
  );

  const onDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, colId: ColumnId) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain');
      if (!tasks || !taskId) return;
      setTasks(
        tasks.map((t) => (t.id === taskId ? { ...t, column: colId } : t)),
      );
      // If the detail modal is open for this task, update it too
      if (detailTask && detailTask.id === taskId) {
        setDetailTask({ ...detailTask, column: colId });
      }
      setDraggedTaskId(null);
      setDragOverColumn(null);
    },
    [tasks, setTasks, detailTask],
  );

  /* ─── Loading state ─────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Загрузка задач...</span>
        </div>
      </div>
    );
  }

  if (!tasks) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <span className="text-text-muted text-sm">Не удалось загрузить задачи</span>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                           */
  /* ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-bg">
      {/* Offscreen drag ghost element */}
      <div
        ref={dragImageRef}
        className="fixed -top-[9999px] -left-[9999px] bg-bg-raised border border-accent rounded-lg px-4 py-2 text-text-primary text-sm opacity-80 max-w-xs truncate pointer-events-none"
        style={{ display: 'none' }}
      />

      {/* ─── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Title + count */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Задачи</h1>
            <span className="text-xs font-medium bg-bg-raised text-text-secondary px-2.5 py-1 rounded-full border border-border">
              {totalCount}
            </span>
          </div>

          {/* Actions */}
          <button
            onClick={() => {
              setNewTask(emptyTask());
              setNewTagsStr('');
              setCreateOpen(true);
            }}
            className={BTN_PRIMARY + ' flex items-center gap-2'}
          >
            <Plus size={16} />
            Новая задача
          </button>
        </div>

        {/* ─── Filters ──────────────────────────────────────────────── */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Filter size={14} />
            <span>Фильтры:</span>
          </div>

          {/* Assignee filter */}
          <div className="flex items-center gap-1 bg-bg-raised rounded-lg p-0.5 border border-border">
            {([['all', 'Все'], ['V', 'Вардгес'], ['B', 'Bond']] as const).map(
              ([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilterAssignee(val)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterAssignee === val
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1 bg-bg-raised rounded-lg p-0.5 border border-border">
            {(
              [
                ['all', 'Все'],
                ['high', 'Высокий'],
                ['medium', 'Средний'],
                ['low', 'Низкий'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterPriority(val)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterPriority === val
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── Board ─────────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
          {COLUMNS.map((col) => {
            const colTasks = tasksByColumn[col.id];
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                className={`flex-shrink-0 w-[320px] flex flex-col rounded-xl border transition-colors duration-200 ${
                  isOver
                    ? 'border-accent bg-accent/5'
                    : 'border-border bg-bg-surface/50'
                }`}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, col.id)}
              >
                {/* Column header */}
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <span className={col.colorClass}>{col.icon}</span>
                  <h2 className={`text-sm font-semibold ${col.colorClass}`}>
                    {col.label}
                  </h2>
                  <span className="ml-auto text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-full border border-border">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {colTasks.length === 0 && (
                    <div className="text-center py-8 text-text-muted text-xs">
                      Нет задач
                    </div>
                  )}
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, task.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => openDetail(task)}
                      className={`group bg-bg-raised border border-border rounded-lg p-3 cursor-pointer hover:border-accent/50 transition-all duration-200 ${
                        draggedTaskId === task.id ? 'opacity-40 scale-95' : 'opacity-100'
                      }`}
                    >
                      {/* Grip + Priority dot row */}
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical
                          size={14}
                          className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        />
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ring-2 ${PRIORITY_CONFIG[task.priority].dot} ${PRIORITY_CONFIG[task.priority].ring}`}
                        />
                        <span className="text-sm font-medium text-text-primary line-clamp-2 leading-snug">
                          {task.title}
                        </span>
                      </div>

                      {/* Tags */}
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2.5 pl-6">
                          {task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg-surface text-text-muted border border-border"
                            >
                              <Tag size={8} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Assignee badge */}
                      <div className="flex items-center justify-end">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${ASSIGNEE_CONFIG[task.assignee].bg}`}
                        >
                          <User size={10} />
                          {ASSIGNEE_CONFIG[task.assignee].short}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ─── Create Task Modal ─────────────────────────────────────── */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новая задача"
      >
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Название
            </label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
              placeholder="Введите название задачи..."
              className={INPUT_CLS}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Описание
            </label>
            <textarea
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
              placeholder="Подробное описание задачи..."
              rows={3}
              className={INPUT_CLS + ' resize-none'}
            />
          </div>

          {/* Assignee + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Исполнитель
              </label>
              <select
                value={newTask.assignee}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    assignee: e.target.value as 'V' | 'B',
                  })
                }
                className={INPUT_CLS}
              >
                <option value="V">Вардгес (V)</option>
                <option value="B">Bond (B)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Приоритет
              </label>
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    priority: e.target.value as 'high' | 'medium' | 'low',
                  })
                }
                className={INPUT_CLS}
              >
                <option value="high">Высокий</option>
                <option value="medium">Средний</option>
                <option value="low">Низкий</option>
              </select>
            </div>
          </div>

          {/* Column */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Колонка
            </label>
            <select
              value={newTask.column}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  column: e.target.value as ColumnId,
                })
              }
              className={INPUT_CLS}
            >
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Теги (через запятую)
            </label>
            <input
              type="text"
              value={newTagsStr}
              onChange={(e) => setNewTagsStr(e.target.value)}
              placeholder="разработка, дизайн, срочно"
              className={INPUT_CLS}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setCreateOpen(false)}
              className={BTN_SECONDARY}
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTask.title.trim()}
              className={BTN_PRIMARY + ' disabled:opacity-40 disabled:cursor-not-allowed'}
            >
              Создать
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Detail / Edit Task Modal ──────────────────────────────── */}
      <Modal
        open={!!detailTask}
        onClose={closeDetail}
        title={editMode ? 'Редактировать задачу' : 'Детали задачи'}
        wide
      >
        {detailTask && !editMode && (
          <div className="space-y-5">
            {/* Title */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                {detailTask.title}
              </h3>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Assignee */}
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${ASSIGNEE_CONFIG[detailTask.assignee].bg}`}
              >
                <User size={12} />
                {ASSIGNEE_CONFIG[detailTask.assignee].label}
              </span>

              {/* Priority */}
              <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                <span
                  className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[detailTask.priority].dot}`}
                />
                {PRIORITY_CONFIG[detailTask.priority].label}
              </span>

              {/* Column */}
              <span className="text-xs text-text-muted bg-bg-raised px-2.5 py-1 rounded-full border border-border">
                {COLUMNS.find((c) => c.id === detailTask.column)?.label}
              </span>
            </div>

            {/* Description */}
            {detailTask.description && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Описание
                </label>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {detailTask.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {detailTask.tags.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Теги
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {detailTask.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-bg-raised text-text-secondary border border-border"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Created at */}
            <div className="text-xs text-text-muted">
              Создано: {new Date(detailTask.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button onClick={handleDelete} className={BTN_DANGER + ' flex items-center gap-1.5'}>
                <Trash2 size={14} />
                Удалить
              </button>
              <div className="flex items-center gap-2">
                <button onClick={closeDetail} className={BTN_SECONDARY}>
                  Закрыть
                </button>
                <button
                  onClick={() => {
                    setEditForm({
                      title: detailTask.title,
                      description: detailTask.description,
                      assignee: detailTask.assignee,
                      priority: detailTask.priority,
                      column: detailTask.column,
                      tags: detailTask.tags,
                    });
                    setEditTagsStr(detailTask.tags.join(', '));
                    setEditMode(true);
                  }}
                  className={BTN_PRIMARY + ' flex items-center gap-1.5'}
                >
                  <Pencil size={14} />
                  Редактировать
                </button>
              </div>
            </div>
          </div>
        )}

        {detailTask && editMode && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Название
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className={INPUT_CLS}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Описание
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={4}
                className={INPUT_CLS + ' resize-none'}
              />
            </div>

            {/* Assignee + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Исполнитель
                </label>
                <select
                  value={editForm.assignee}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      assignee: e.target.value as 'V' | 'B',
                    })
                  }
                  className={INPUT_CLS}
                >
                  <option value="V">Вардгес (V)</option>
                  <option value="B">Bond (B)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Приоритет
                </label>
                <select
                  value={editForm.priority}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      priority: e.target.value as 'high' | 'medium' | 'low',
                    })
                  }
                  className={INPUT_CLS}
                >
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>
              </div>
            </div>

            {/* Column */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Колонка
              </label>
              <select
                value={editForm.column}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    column: e.target.value as ColumnId,
                  })
                }
                className={INPUT_CLS}
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Теги (через запятую)
              </label>
              <input
                type="text"
                value={editTagsStr}
                onChange={(e) => setEditTagsStr(e.target.value)}
                className={INPUT_CLS}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button onClick={handleDelete} className={BTN_DANGER + ' flex items-center gap-1.5'}>
                <Trash2 size={14} />
                Удалить
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className={BTN_SECONDARY}
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={!editForm.title.trim()}
                  className={BTN_PRIMARY + ' disabled:opacity-40 disabled:cursor-not-allowed'}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
