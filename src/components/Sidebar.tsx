'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  FolderKanban,
  Brain,
  FileText,
  Users,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/mission-control', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/mission-control/tasks', label: 'Задачи', icon: ListTodo },
  { href: '/mission-control/calendar', label: 'Календарь', icon: Calendar },
  { href: '/mission-control/projects', label: 'Проекты', icon: FolderKanban },
  { href: '/mission-control/memory', label: 'Память', icon: Brain },
  { href: '/mission-control/docs', label: 'Документы', icon: FileText },
  { href: '/mission-control/team', label: 'Команда', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/mission-control') return pathname === '/mission-control' || pathname === '/mission-control/';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              MC
            </div>
            <span className="text-text-primary font-semibold text-sm truncate">Mission Control</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-md hover:bg-bg-raised text-text-muted hover:text-text-primary transition-colors"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${
                active
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r" />
              )}
              <Icon size={18} className={active ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Bond status */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
              B
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-bg-surface" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm text-text-primary font-medium">Bond</div>
              <div className="text-xs text-emerald-400">Online</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-bg-raised border border-border text-text-primary"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-bg-surface border-r border-border z-50 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-bg-raised text-text-muted"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-bg-surface border-r border-border h-screen transition-all duration-300 flex-shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
