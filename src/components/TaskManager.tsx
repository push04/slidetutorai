import { useState, useEffect } from 'react';
import { Plus, Check, Trash2, Clock, Target, Filter } from 'lucide-react';
import { Card, CardContent } from './enhanced/Card';
import { Button } from './enhanced/Button';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

type Priority = 'low' | 'medium' | 'high';
type Status = 'todo' | 'in-progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate?: string;
  createdAt: Date;
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as Priority, dueDate: '' });
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('slidetutor-tasks');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTasks(parsed.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })));
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load saved tasks');
    }
  }, []);

  useEffect(() => {
    try {
      if (tasks.length > 0) {
        localStorage.setItem('slidetutor-tasks', JSON.stringify(tasks));
      } else {
        localStorage.removeItem('slidetutor-tasks');
      }
    } catch (error) {
      console.error('Failed to save tasks:', error);
      toast.error('Failed to save tasks to storage');
    }
  }, [tasks]);

  const addTask = () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required!');
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: 'todo',
      dueDate: newTask.dueDate || undefined,
      createdAt: new Date(),
    };

    setTasks([task, ...tasks]);
    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
    toast.success('Task added!');
  };

  const toggleStatus = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const newStatus = t.status === 'done' ? 'todo' : t.status === 'todo' ? 'in-progress' : 'done';
        return { ...t, status: newStatus };
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    toast.success('Task deleted!');
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'from-red-500 to-orange-500';
      case 'medium': return 'from-yellow-500 to-amber-500';
      case 'low': return 'from-green-500 to-emerald-500';
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            Task Manager
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-500">{stats.todo}</div>
              <div className="text-sm text-muted-foreground">To Do</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-500">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-500">{stats.done}</div>
              <div className="text-sm text-muted-foreground">Done</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Task */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Task
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Task title *"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <textarea
                placeholder="Description (optional)"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                rows={3}
                className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value as Priority})}
                    className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                    className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addTask} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Filters:</span>
              </div>
              <div className="flex gap-2">
                {(['all', 'todo', 'in-progress', 'done'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-sm transition-colors',
                      filterStatus === status
                        ? 'bg-primary text-primary-foreground'
                        : 'glass-card border border-border/40 text-foreground hover:border-primary/50'
                    )}
                  >
                    {status.replace('-', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(['all', 'high', 'medium', 'low'] as const).map(priority => (
                  <button
                    key={priority}
                    onClick={() => setFilterPriority(priority)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-sm transition-colors',
                      filterPriority === priority
                        ? 'bg-primary text-primary-foreground'
                        : 'glass-card border border-border/40 text-foreground hover:border-primary/50'
                    )}
                  >
                    {priority.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No tasks found. Create one to get started!</p>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map(task => (
              <Card key={task.id} className={cn(
                'transition-all',
                task.status === 'done' && 'opacity-60'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleStatus(task.id)}
                      className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                        task.status === 'done'
                          ? 'bg-green-500 border-green-500'
                          : task.status === 'in-progress'
                          ? 'bg-yellow-500 border-yellow-500'
                          : 'border-border hover:border-primary'
                      )}
                    >
                      {task.status === 'done' && <Check className="w-4 h-4 text-white" />}
                      {task.status === 'in-progress' && <Clock className="w-4 h-4 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h4 className={cn(
                          'font-semibold text-foreground',
                          task.status === 'done' && 'line-through opacity-60'
                        )}>
                          {task.title}
                        </h4>
                        <div className={`px-2 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${getPriorityColor(task.priority)} text-white`}>
                          {task.priority.toUpperCase()}
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <span>Created: {task.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="flex-shrink-0 p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskManager;
