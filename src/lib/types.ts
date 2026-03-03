export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: 'V' | 'B';
  priority: 'high' | 'medium' | 'low';
  column: 'backlog' | 'in-progress' | 'review' | 'done';
  tags: string[];
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  milestones: Milestone[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'cron' | 'deadline' | 'meeting' | 'reminder';
  recurring: boolean;
  description: string;
}

export interface Memory {
  id: string;
  title: string;
  content: string;
  type: 'work' | 'system' | 'achievement' | 'idea' | 'research';
  tags: string[];
  pinned: boolean;
  createdAt: string;
}

export interface Doc {
  id: string;
  title: string;
  category: 'plans' | 'drafts' | 'content' | 'technical';
  format: 'md' | 'plan' | 'draft' | 'newsletter';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentStats {
  tasksCompleted: number;
  [key: string]: number | string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  platform?: string;
  model?: string;
  description: string;
  status: 'online' | 'idle' | 'offline';
  currentTask: string;
  capabilities: string[];
  stats: AgentStats;
}

export interface TeamData {
  owner: Agent & { nameEn: string };
  mainAgent: Agent;
  subAgents: Agent[];
}

export type ColumnId = 'backlog' | 'in-progress' | 'review' | 'done';
