'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Grid3X3,
  List,
  ArrowLeft,
  Edit3,
  Trash2,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import type { Doc } from '@/lib/types';
import Modal from '@/components/Modal';

type Category = Doc['category'];
type Format = Doc['format'];
type ViewMode = 'grid' | 'list';

const CATEGORY_LABELS: Record<Category, string> = {
  plans: 'Планы',
  drafts: 'Черновики',
  content: 'Контент',
  technical: 'Технические',
};

const CATEGORY_STYLES: Record<Category, string> = {
  plans: 'bg-blue-500/10 text-blue-400',
  drafts: 'bg-amber-500/10 text-amber-400',
  content: 'bg-emerald-500/10 text-emerald-400',
  technical: 'bg-violet-500/10 text-violet-400',
};

const FORMAT_STYLES: Record<Format, string> = {
  md: 'bg-slate-500/10 text-slate-400',
  plan: 'bg-blue-500/10 text-blue-400',
  draft: 'bg-amber-500/10 text-amber-400',
  newsletter: 'bg-pink-500/10 text-pink-400',
};

const FILTER_TABS: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'plans', label: 'Планы' },
  { key: 'drafts', label: 'Черновики' },
  { key: 'content', label: 'Контент' },
  { key: 'technical', label: 'Технические' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split('\n');
  const htmlParts: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Close list if current line is not a list item
    if (inList && !line.startsWith('- ')) {
      htmlParts.push('</ul>');
      inList = false;
    }

    if (line.startsWith('### ')) {
      const text = processInline(line.slice(4));
      htmlParts.push(
        `<h3 class="text-lg font-medium text-text-primary mb-2">${text}</h3>`
      );
    } else if (line.startsWith('## ')) {
      const text = processInline(line.slice(3));
      htmlParts.push(
        `<h2 class="text-xl font-semibold text-text-primary mb-3">${text}</h2>`
      );
    } else if (line.startsWith('# ')) {
      const text = processInline(line.slice(2));
      htmlParts.push(
        `<h1 class="text-2xl font-bold text-text-primary mb-4">${text}</h1>`
      );
    } else if (line.startsWith('- ')) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc list-inside space-y-1 text-text-secondary">');
        inList = true;
      }
      const text = processInline(line.slice(2));
      htmlParts.push(`<li>${text}</li>`);
    } else if (line.trim() === '') {
      htmlParts.push('<div class="h-2"></div>');
    } else {
      const text = processInline(line);
      htmlParts.push(`<p class="text-text-secondary">${text}</p>`);
    }
  }

  if (inList) {
    htmlParts.push('</ul>');
  }

  return (
    <div
      className="prose-custom space-y-2"
      dangerouslySetInnerHTML={{ __html: htmlParts.join('') }}
    />
  );
}

function processInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export default function DocsPage() {
  const [docs, setDocs, loading] = useLocalStorage<Doc[]>(
    'mc-docs',
    '/mission-control/data/docs.json'
  );

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Category | 'all'>('all');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  // New document form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('plans');
  const [newFormat, setNewFormat] = useState<Format>('md');

  const allDocs = useMemo(() => docs ?? [], [docs]);

  const filteredDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      const matchesCategory =
        activeFilter === 'all' || doc.category === activeFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [allDocs, activeFilter, search]);

  const selectedDoc = useMemo(() => {
    if (!selectedDocId) return null;
    return allDocs.find((d) => d.id === selectedDocId) ?? null;
  }, [allDocs, selectedDocId]);

  const handleCreate = useCallback(() => {
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    const doc: Doc = {
      id: 'doc-' + Date.now(),
      title: newTitle.trim(),
      content: newContent,
      category: newCategory,
      format: newFormat,
      createdAt: now,
      updatedAt: now,
    };
    setDocs([doc, ...allDocs]);
    setNewTitle('');
    setNewContent('');
    setNewCategory('plans');
    setNewFormat('md');
    setShowModal(false);
  }, [newTitle, newContent, newCategory, newFormat, allDocs, setDocs]);

  const handleSaveEdit = useCallback(() => {
    if (!selectedDocId) return;
    const updated = allDocs.map((d) =>
      d.id === selectedDocId
        ? { ...d, content: editContent, updatedAt: new Date().toISOString() }
        : d
    );
    setDocs(updated);
    setIsEditing(false);
  }, [selectedDocId, editContent, allDocs, setDocs]);

  const handleDelete = useCallback(() => {
    if (!selectedDocId) return;
    setDocs(allDocs.filter((d) => d.id !== selectedDocId));
    setSelectedDocId(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [selectedDocId, allDocs, setDocs]);

  const handleCopy = useCallback(async () => {
    if (!selectedDoc) return;
    try {
      await navigator.clipboard.writeText(selectedDoc.content);
    } catch {
      // fallback: ignore
    }
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  }, [selectedDoc]);

  const openDoc = useCallback(
    (doc: Doc) => {
      setSelectedDocId(doc.id);
      setIsEditing(false);
      setEditContent(doc.content);
    },
    []
  );

  const startEdit = useCallback(() => {
    if (selectedDoc) {
      setEditContent(selectedDoc.content);
      setIsEditing(true);
    }
  }, [selectedDoc]);

  const goBack = useCallback(() => {
    setSelectedDocId(null);
    setIsEditing(false);
  }, []);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- Detail view ---
  if (selectedDoc) {
    return (
      <div className="p-6 max-w-4xl mx-auto relative">
        {/* Copy toast */}
        {copyToast && (
          <div className="absolute top-4 right-6 bg-emerald-500/90 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
            Скопировано!
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            <ArrowLeft size={18} />
            Назад
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary transition-colors"
            >
              {copyToast ? <Check size={16} /> : <Copy size={16} />}
              Копировать
            </button>
            {!isEditing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary transition-colors"
              >
                <Edit3 size={16} />
                Редактировать
              </button>
            ) : (
              <button
                onClick={handleSaveEdit}
                className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Сохранить
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={16} />
              Удалить
            </button>
          </div>
        </div>

        {/* Document header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-3">
            {selectedDoc.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[selectedDoc.category]}`}
            >
              {CATEGORY_LABELS[selectedDoc.category]}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${FORMAT_STYLES[selectedDoc.format]}`}
            >
              {selectedDoc.format}
            </span>
            <span className="text-xs text-text-muted">
              Создан: {formatDate(selectedDoc.createdAt)}
            </span>
            <span className="text-xs text-text-muted">
              Обновлён: {formatDate(selectedDoc.updatedAt)}
            </span>
          </div>
        </div>

        {/* Document content */}
        <div className="bg-bg-surface border border-border rounded-xl p-6">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent min-h-[400px] font-mono resize-y"
            />
          ) : (
            renderMarkdown(selectedDoc.content)
          )}
        </div>

        {/* Delete confirmation modal */}
        <Modal
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Удалить документ"
        >
          <p className="text-text-secondary text-sm mb-6">
            Вы уверены, что хотите удалить документ &laquo;{selectedDoc.title}
            &raquo;? Это действие нельзя отменить.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-raised transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Удалить
            </button>
          </div>
        </Modal>
      </div>
    );
  }

  // --- List / Grid view ---
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Документы</h1>
          <p className="text-sm text-text-muted mt-1">
            {allDocs.length} документов
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Новый документ
        </button>
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Поиск документов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-raised border border-border rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center bg-bg-raised border border-border rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-bg-surface text-accent shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-bg-surface text-accent shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === tab.key
                ? 'bg-accent/10 text-accent'
                : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredDocs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="text-text-muted mb-4" />
          <p className="text-text-secondary text-sm">Документы не найдены</p>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filteredDocs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => openDoc(doc)}
              className="bg-bg-surface border border-border rounded-xl p-4 text-left hover:border-accent/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-1">
                  {doc.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[doc.category]}`}
                >
                  {CATEGORY_LABELS[doc.category]}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${FORMAT_STYLES[doc.format]}`}
                >
                  {doc.format}
                </span>
              </div>
              <p className="text-xs text-text-muted line-clamp-2 mb-3">
                {doc.content.slice(0, 80)}
                {doc.content.length > 80 ? '...' : ''}
              </p>
              <p className="text-xs text-text-muted">{formatDate(doc.updatedAt)}</p>
            </button>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && filteredDocs.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">
                  Название
                </th>
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">
                  Категория
                </th>
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">
                  Формат
                </th>
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">
                  Дата
                </th>
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">
                  Превью
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => openDoc(doc)}
                  className="border-b border-border last:border-b-0 hover:bg-bg-raised cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-text-primary font-medium">
                    {doc.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[doc.category]}`}
                    >
                      {CATEGORY_LABELS[doc.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${FORMAT_STYLES[doc.format]}`}
                    >
                      {doc.format}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {formatDate(doc.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted max-w-xs truncate">
                    {doc.content.slice(0, 80)}
                    {doc.content.length > 80 ? '...' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New document modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Новый документ"
        wide
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Название
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Название документа"
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Категория
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as Category)}
                className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="plans">Планы</option>
                <option value="drafts">Черновики</option>
                <option value="content">Контент</option>
                <option value="technical">Технические</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Формат
              </label>
              <select
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value as Format)}
                className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="md">md</option>
                <option value="plan">plan</option>
                <option value="draft">draft</option>
                <option value="newsletter">newsletter</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Содержание
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Содержание документа..."
              rows={10}
              className="w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-y font-mono"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-raised transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Создать
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
