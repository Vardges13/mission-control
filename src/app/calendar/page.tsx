'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import type { CalendarEvent } from '@/lib/types';
import Modal from '@/components/Modal';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const EVENT_TYPE_CONFIG: Record<CalendarEvent['type'], { dot: string; bg: string; text: string; label: string }> = {
  cron: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Cron' },
  deadline: { dot: 'bg-blue-400', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Дедлайн' },
  meeting: { dot: 'bg-violet-400', bg: 'bg-violet-500/10', text: 'text-violet-400', label: 'Встреча' },
  reminder: { dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Напоминание' },
};

const TODAY = new Date(2026, 2, 3); // March 3, 2026

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  // Convert from Sunday=0 to Monday=0
  return day === 0 ? 6 : day - 1;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

interface CalendarDay {
  year: number;
  month: number;
  day: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function buildCalendarGrid(year: number, month: number): CalendarDay[] {
  const days: CalendarDay[] = [];
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);

  // Previous month fill
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    days.push({
      year: prevYear,
      month: prevMonth,
      day: d,
      dateKey: formatDateKey(prevYear, prevMonth, d),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month
  const todayKey = formatDateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(year, month, d);
    days.push({
      year,
      month,
      day: d,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
    });
  }

  // Next month fill (complete the grid to 6 rows = 42 cells, or at minimum fill the last row)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push({
        year: nextYear,
        month: nextMonth,
        day: d,
        dateKey: formatDateKey(nextYear, nextMonth, d),
        isCurrentMonth: false,
        isToday: false,
      });
    }
  }

  return days;
}

const INPUT_CLASS = 'w-full bg-bg-raised border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent';
const BTN_PRIMARY = 'bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors';

export default function CalendarPage() {
  const [events, setEvents, loading] = useLocalStorage<CalendarEvent[]>('mc-calendar', '/mission-control/data/calendar.json');
  const [currentYear, setCurrentYear] = useState(TODAY.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(TODAY.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formType, setFormType] = useState<CalendarEvent['type']>('meeting');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formDescription, setFormDescription] = useState('');

  const allEvents = useMemo(() => events ?? [], [events]);

  const calendarDays = useMemo(() => buildCalendarGrid(currentYear, currentMonth), [currentYear, currentMonth]);

  // Map dateKey -> events for quick lookup
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of allEvents) {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    }
    return map;
  }, [allEvents]);

  // Upcoming events: next 7 days from today (March 3 2026)
  const upcomingEvents = useMemo(() => {
    const start = new Date(TODAY);
    const end = new Date(TODAY);
    end.setDate(end.getDate() + 7);
    const startKey = formatDateKey(start.getFullYear(), start.getMonth(), start.getDate());
    const endKey = formatDateKey(end.getFullYear(), end.getMonth(), end.getDate());
    return allEvents
      .filter((evt) => evt.date >= startKey && evt.date < endKey)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });
  }, [allEvents]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDateKey) return [];
    return (eventsByDate[selectedDateKey] ?? []).sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDateKey, eventsByDate]);

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const openModal = useCallback(() => {
    setFormTitle('');
    setFormDate(selectedDateKey ?? formatDateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()));
    setFormTime('12:00');
    setFormType('meeting');
    setFormRecurring(false);
    setFormDescription('');
    setModalOpen(true);
  }, [selectedDateKey]);

  const handleAddEvent = useCallback(() => {
    if (!formTitle.trim() || !formDate) return;
    const newEvent: CalendarEvent = {
      id: 'evt-' + Date.now(),
      title: formTitle.trim(),
      date: formDate,
      time: formTime || '00:00',
      type: formType,
      recurring: formRecurring,
      description: formDescription.trim(),
    };
    setEvents([...allEvents, newEvent]);
    setModalOpen(false);
  }, [formTitle, formDate, formTime, formType, formRecurring, formDescription, allEvents, setEvents]);

  const handleDeleteEvent = useCallback(
    (eventId: string) => {
      setEvents(allEvents.filter((e) => e.id !== eventId));
    },
    [allEvents, setEvents],
  );

  const formatSelectedDate = (dateKey: string): string => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][date.getDay()];
    return `${d} ${MONTH_NAMES[m - 1].toLowerCase()} ${y}, ${dayOfWeek}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-muted text-sm">Загрузка календаря...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon size={24} className="text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Календарь</h1>
        </div>
        <button onClick={openModal} className={BTN_PRIMARY + ' flex items-center gap-2'}>
          <Plus size={16} />
          Добавить событие
        </button>
      </div>

      {/* Main layout: Calendar + Side panel */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Calendar grid (2/3) */}
        <div className="lg:w-2/3">
          <div className="bg-bg-surface border border-border rounded-xl p-5">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={goToPrevMonth}
                className="p-2 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-semibold text-text-primary">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Day names header */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES.map((name) => (
                <div key={name} className="text-center text-xs font-medium text-text-muted py-2">
                  {name}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((cd) => {
                const dayEvents = eventsByDate[cd.dateKey] ?? [];
                const isSelected = selectedDateKey === cd.dateKey;
                // Unique event types present on this day (max 4 dots)
                const eventTypes = [...new Set(dayEvents.map((e) => e.type))];

                return (
                  <button
                    key={cd.dateKey}
                    onClick={() => setSelectedDateKey(cd.dateKey)}
                    className={`
                      relative flex flex-col items-center py-2 px-1 min-h-[56px] rounded-lg transition-colors
                      ${cd.isCurrentMonth ? 'text-text-primary' : 'text-text-muted'}
                      ${isSelected ? 'bg-bg-raised' : 'hover:bg-bg-raised/50'}
                      ${cd.isToday ? 'ring-2 ring-accent ring-inset' : ''}
                    `}
                  >
                    <span className={`text-sm font-medium ${cd.isToday ? 'text-accent' : ''}`}>
                      {cd.day}
                    </span>
                    {/* Event dots */}
                    {eventTypes.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {eventTypes.slice(0, 4).map((type) => (
                          <span
                            key={type}
                            className={`w-1.5 h-1.5 rounded-full ${EVENT_TYPE_CONFIG[type].dot}`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming events */}
          <div className="mt-6 bg-bg-surface border border-border rounded-xl p-5">
            <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              Ближайшие события (7 дней)
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-text-muted text-sm">Нет предстоящих событий</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((evt) => {
                  const cfg = EVENT_TYPE_CONFIG[evt.type];
                  return (
                    <div
                      key={evt.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-bg-raised/50 hover:bg-bg-raised transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">
                          {evt.title}
                        </div>
                        <div className="text-xs text-text-muted">
                          {evt.date} &middot; {evt.time}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected day panel (1/3) */}
        <div className="lg:w-1/3">
          <div className="bg-bg-surface border border-border rounded-xl p-5 sticky top-6">
            {selectedDateKey ? (
              <>
                <h3 className="text-base font-semibold text-text-primary mb-1">
                  События дня
                </h3>
                <p className="text-xs text-text-muted mb-4">
                  {formatSelectedDate(selectedDateKey)}
                </p>

                {selectedDayEvents.length === 0 ? (
                  <p className="text-text-muted text-sm">Нет событий на этот день</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.map((evt) => {
                      const cfg = EVENT_TYPE_CONFIG[evt.type];
                      return (
                        <div
                          key={evt.id}
                          className="p-3 rounded-lg bg-bg-raised border border-border"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-text-primary">
                                {evt.title}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                  <Clock size={12} />
                                  {evt.time}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                  {cfg.label}
                                </span>
                              </div>
                              {evt.description && (
                                <p className="text-xs text-text-secondary mt-2">
                                  {evt.description}
                                </p>
                              )}
                              {evt.recurring && (
                                <span className="inline-block mt-1.5 text-xs text-text-muted bg-bg/50 px-1.5 py-0.5 rounded">
                                  Повторяющееся
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="p-1.5 rounded-md hover:bg-bg text-text-muted hover:text-red-400 transition-colors flex-shrink-0"
                              title="Удалить событие"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={openModal}
                  className={`${BTN_PRIMARY} w-full mt-4 flex items-center justify-center gap-2`}
                >
                  <Plus size={16} />
                  Добавить событие
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <CalendarIcon size={16} className="text-accent" />
                  Выберите день
                </h3>
                <p className="text-sm text-text-muted">
                  Нажмите на день в календаре, чтобы просмотреть события
                </p>

                {/* Legend */}
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Типы событий
                  </p>
                  {(Object.keys(EVENT_TYPE_CONFIG) as CalendarEvent['type'][]).map((type) => {
                    const cfg = EVENT_TYPE_CONFIG[type];
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                        <span className="text-sm text-text-secondary">{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Добавить событие">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Название
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Название события"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Дата
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Время
              </label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Тип события
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as CalendarEvent['type'])}
              className={INPUT_CLASS}
            >
              <option value="cron">Cron</option>
              <option value="deadline">Дедлайн</option>
              <option value="meeting">Встреча</option>
              <option value="reminder">Напоминание</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={formRecurring}
              onChange={(e) => setFormRecurring(e.target.checked)}
              className="rounded border-border bg-bg-raised text-accent focus:ring-accent"
            />
            <label htmlFor="recurring" className="text-sm text-text-secondary">
              Повторяющееся событие
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Описание
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Описание события (необязательно)"
              rows={3}
              className={INPUT_CLASS + ' resize-none'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-raised transition-colors"
            >
              Отмена
            </button>
            <button onClick={handleAddEvent} className={BTN_PRIMARY}>
              Добавить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
