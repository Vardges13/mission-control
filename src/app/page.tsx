'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ListTodo,
  FileText,
  FolderKanban,
  Brain,
  TrendingUp,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import type { Task, Project, Memory } from '@/lib/types';
import Modal from '@/components/Modal';

export default function DashboardPage() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('mc-tasks', '/mission-control/data/tasks.json');
  const [projects] = useLocalStorage<Project[]>('mc-projects', '/mission-control/data/projects.json');
  const [memories] = useLocalStorage<Memory[]>('mc-memories', '/mission-control/data/memories.json');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignee: 'B' as 'V' | 'B', priority: 'medium' as 'high' | 'medium' | 'low', tags: '' });
  const [newDoc, setNewDoc] = useState<{ title: string; content: string; category: string; format: string }>({ title: '', content: '', category: 'plans', format: 'md' });

  const stats = useMemo(() => {
    if (!tasks) return { active: 0, queued: 0, review: 0, done: 0 };
    return {
      active: tasks.filter(t => t.column === 'in-progress').length,
      queued: tasks.filter(t => t.column === 'backlog').length,
      review: tasks.filter(t => t.column === 'review').length,
      done: tasks.filter(t => t.column === 'done').length,
    };
  }, [tasks]);

  const recentMemories = useMemo(() => {
    if (!memories) return [];
    return [...memories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [memories]);

  const handleCreateTask = () => {
    if (!newTask.title.trim() || !tasks) return;
    const task: Task = {
      id: 'task-' + Date.now(),
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      assignee: newTask.assignee,
      priority: newTask.priority,
      column: 'backlog',
      tags: newTask.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    setTasks([task, ...tasks]);
    setNewTask({ title: '', description: '', assignee: 'B', priority: 'medium', tags: '' });
    setShowTaskModal(false);
  };

  const handleCreateDoc = () => {
    if (!newDoc.title.trim()) return;
    const stored = localStorage.getItem('mc-docs');
    const docs = stored ? JSON.parse(stored) : [];
    const doc = {
      id: 'doc-' + Date.now(),
      title: newDoc.title.trim(),
      content: newDoc.content,
      category: newDoc.category,
      format: newDoc.format,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [doc, ...docs];
    localStorage.setItem('mc-docs', JSON.stringify(updated));
    setNewDoc({ title: '', content: '', category: 'plans', format: 'md' });
    setShowDocModal(false);
  };

  const statCards = [
    { label: 'В работе', value: stats.active, icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'В очереди', value: stats.queued, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'На ревью', value: stats.review, icon: AlertCircle, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Готово', value: stats.done, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  const typeLabels: Record<string, string> = {
    work: 'Работа',
    system: 'Система',
    achievement: 'Достижение',
    idea: 'Идея',
    research: 'Исследование',
  };
  const typeColors: Record<string, string> = {
    work: 'bg-blue-500/10 text-blue-400',
    system: 'bg-slate-500/10 text-slate-400',
    achievement: 'bg-emerald-500/10 text-emerald-400',
    idea: 'bg-violet-500/10 text-violet-400',
    research: 'bg-amber-500/10 text-amber-400',
  };

  const inputClass = 'w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent';

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in">
      {/* Mission Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent/20 via-purple-500/20 to-pink-500/20 border border-accent/20 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 text-accent text-sm font-medium mb-2">
            <TrendingUp size={16} />
            <span>Миссия</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary mb-2">
            Построить систему AI-агентов для автоматизации бизнеса
          </h1>
          <p className="text-text-secondary text-sm md:text-base">
            Бизнес на автомате — 50 агентов, которые заменяют сотрудников и экономят 20+ часов в неделю.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href="/tasks"
              className="bg-bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon size={18} className={card.color} />
                </div>
              </div>
              <div className="text-2xl font-bold text-text-primary">{card.value}</div>
              <div className="text-sm text-text-muted mt-1">{card.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <FolderKanban size={20} className="text-accent" />
              Проекты
            </h2>
            <Link href="/projects" className="text-sm text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
              Все проекты <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects?.slice(0, 4).map((project) => {
              const completed = project.milestones.filter(m => m.completed).length;
              const total = project.milestones.length;
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <Link
                  key={project.id}
                  href="/projects"
                  className="bg-bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-text-primary truncate">{project.title}</h3>
                    <span className="text-xs text-text-muted ml-2 flex-shrink-0">{percent}%</span>
                  </div>
                  <div className="w-full bg-bg-raised rounded-full h-1.5 mb-2">
                    <div
                      className="bg-gradient-to-r from-accent to-purple-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-xs text-text-muted">{completed} из {total} этапов</div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Brain size={20} className="text-accent" />
              Активность
            </h2>
            <Link href="/memory" className="text-sm text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
              Вся память <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentMemories.map((mem) => (
              <Link
                key={mem.id}
                href="/memory"
                className="block bg-bg-surface border border-border rounded-xl p-3 hover:border-accent/30 transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${typeColors[mem.type] || 'bg-slate-500/10 text-slate-400'}`}>
                    {typeLabels[mem.type] || mem.type}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(mem.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-text-primary truncate">{mem.title}</h4>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowTaskModal(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Новая задача
        </button>
        <button
          onClick={() => setShowDocModal(true)}
          className="flex items-center gap-2 bg-bg-surface border border-border hover:border-accent/30 text-text-primary px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <FileText size={16} />
          Новый документ
        </button>
        <Link
          href="/tasks"
          className="flex items-center gap-2 bg-bg-surface border border-border hover:border-accent/30 text-text-primary px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <ListTodo size={16} />
          Канбан доска
        </Link>
      </div>

      {/* New Task Modal */}
      <Modal open={showTaskModal} onClose={() => setShowTaskModal(false)} title="Новая задача">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Название</label>
            <input className={inputClass} value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Название задачи..." />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Описание</label>
            <textarea className={`${inputClass} h-24 resize-none`} value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Описание..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Исполнитель</label>
              <select className={inputClass} value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value as 'V' | 'B' })}>
                <option value="V">Вардгес</option>
                <option value="B">Bond</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Приоритет</label>
              <select className={inputClass} value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as 'high' | 'medium' | 'low' })}>
                <option value="high">Высокий</option>
                <option value="medium">Средний</option>
                <option value="low">Низкий</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Теги (через запятую)</label>
            <input className={inputClass} value={newTask.tags} onChange={e => setNewTask({ ...newTask, tags: e.target.value })} placeholder="тег1, тег2..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-raised transition-colors">
              Отмена
            </button>
            <button onClick={handleCreateTask} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Создать
            </button>
          </div>
        </div>
      </Modal>

      {/* New Doc Modal */}
      <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title="Новый документ">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Название</label>
            <input className={inputClass} value={newDoc.title} onChange={e => setNewDoc({ ...newDoc, title: e.target.value })} placeholder="Название документа..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Категория</label>
              <select className={inputClass} value={newDoc.category} onChange={e => setNewDoc({ ...newDoc, category: e.target.value })}>
                <option value="plans">Планы</option>
                <option value="drafts">Черновики</option>
                <option value="content">Контент</option>
                <option value="technical">Технические</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Формат</label>
              <select className={inputClass} value={newDoc.format} onChange={e => setNewDoc({ ...newDoc, format: e.target.value })}>
                <option value="md">Markdown</option>
                <option value="plan">План</option>
                <option value="draft">Черновик</option>
                <option value="newsletter">Рассылка</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Содержание</label>
            <textarea className={`${inputClass} h-40 resize-none`} value={newDoc.content} onChange={e => setNewDoc({ ...newDoc, content: e.target.value })} placeholder="Содержание документа..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowDocModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-raised transition-colors">
              Отмена
            </button>
            <button onClick={handleCreateDoc} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Создать
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
