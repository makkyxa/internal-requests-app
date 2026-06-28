import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Trash2,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Loader2,
  Sparkles,
  X,
  Lock,
  ArrowUpDown
} from 'lucide-react';

// --- ИНТЕРФЕЙСЫ ---
interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: 'new' | 'in_progress' | 'done';
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
}

interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ApiError {
  detail: string | { msg: string }[];
}

const API_BASE_URL = 'http://localhost:8000/api';

export default function App() {
  // --- СОСТОЯНИЕ СПИСКА И ФИЛЬТРОВ ---
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metadata, setMetadata] = useState<PaginationMetadata>({
    total: 0,
    page: 1,
    limit: 5,
    pages: 1
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // --- СОСТОЯНИЕ СОЗДАНИЯ ЗАЯВКИ ---
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [newStatus, setNewStatus] = useState<'new' | 'in_progress'>('new');
  const [createLoading, setCreateLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // --- СОСТОЯНИЕ АВТОРИЗАЦИИ ---
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token');
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // --- СОСТОЯНИЕ УВЕДОМЛЕНИЙ ---
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  // --- ДОБАВЛЕНИЕ УВЕДОМЛЕНИЯ ---
  const addNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  // --- ЗАГРУЗКА ЗАЯВОК ИЗ API ---
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: metadata.limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });

      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (search) params.append('search', search);

      const response = await fetch(`${API_BASE_URL}/tickets?${params.toString()}`);
      if (!response.ok) {
        const errData: ApiError = await response.json();
        throw new Error(typeof errData.detail === 'string' ? errData.detail : 'Ошибка при загрузке заявок');
      }

      const data = await response.json();
      setTickets(data.items);
      setMetadata(data.metadata);
    } catch (err: any) {
      addNotification(err.message || 'Не удалось загрузить список заявок', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, metadata.limit, statusFilter, priorityFilter, search, sortBy, sortOrder, addNotification]);

  // Запуск загрузки при изменении фильтров, сортировки или страницы
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Сброс страницы на 1 при изменении фильтров
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter, sortBy, sortOrder]);

  // --- АВТОРИЗАЦИЯ (ВХОД / ВЫХОД) ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      if (!response.ok) {
        const errData: ApiError = await response.json();
        throw new Error(typeof errData.detail === 'string' ? errData.detail : 'Неверный логин или пароль');
      }

      const data = await response.json();
      setAdminToken(data.token);
      localStorage.setItem('admin_token', data.token);
      addNotification('Вход выполнен успешно! Права администратора активированы.', 'success');
      setShowLoginModal(false);
      setLoginUsername('');
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message);
      addNotification(err.message || 'Ошибка авторизации', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('admin_token');
    addNotification('Вы вышли из режима администратора.', 'success');
  };

  // --- СОЗДАНИЕ НОВОЙ ЗАЯВКИ ---
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Валидация на фронтенде
    if (newTitle.trim().length < 3 || newTitle.trim().length > 120) {
      setFormError('Название должно быть от 3 до 120 символов.');
      return;
    }
    if (newDescription.trim().length > 1000) {
      setFormError('Описание не должно превышать 1000 символов.');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          priority: newPriority,
          status: newStatus
        })
      });

      if (!response.ok) {
        const errData: ApiError = await response.json();
        throw new Error(typeof errData.detail === 'string' ? errData.detail : 'Не удалось создать заявку');
      }

      addNotification('Заявка успешно создана!', 'success');
      setNewTitle('');
      setNewDescription('');
      setNewPriority('normal');
      setNewStatus('new');
      fetchTickets();
    } catch (err: any) {
      setFormError(err.message);
      addNotification(err.message || 'Ошибка создания заявки', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // --- БЫСТРОЕ ИЗМЕНЕНИЕ СТАТУСА ---
  const handleStatusChange = async (ticketId: number, newStatusVal: 'new' | 'in_progress' | 'done') => {
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatusVal })
      });

      if (!response.ok) {
        const errData: ApiError = await response.json();
        throw new Error(typeof errData.detail === 'string' ? errData.detail : 'Не удалось изменить статус');
      }

      addNotification(`Статус заявки #${ticketId} изменен.`, 'success');
      fetchTickets();
    } catch (err: any) {
      addNotification(err.message || 'Ошибка обновления статуса', 'error');
    }
  };

  // --- УДАЛЕНИЕ ЗАЯВКИ ---
  const handleDeleteTicket = async (ticketId: number) => {
    if (!adminToken) {
      addNotification('Для удаления заявки необходимо войти под админом admin:admin', 'error');
      return;
    }

    if (!window.confirm(`Вы уверены, что хотите удалить заявку #${ticketId}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        const errData: ApiError = await response.json();
        throw new Error(typeof errData.detail === 'string' ? errData.detail : 'Не удалось удалить заявку');
      }

      addNotification(`Заявка #${ticketId} успешно удалена.`, 'success');
      fetchTickets();
    } catch (err: any) {
      addNotification(err.message || 'Ошибка удаления заявки', 'error');
    }
  };

  // Вспомогательные классы для приоритетов
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'normal':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'low':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Высокий';
      case 'normal': return 'Средний';
      case 'low': return 'Низкий';
      default: return priority;
    }
  };

  // Вспомогательные классы для статусов
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'in_progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'new':
        return 'bg-brand-500/10 text-brand-400 border-brand-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done': return 'Выполнено';
      case 'in_progress': return 'В процессе';
      case 'new': return 'Новая';
      default: return status;
    }
  };

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // Возвращаем дату в формате UTC для соответствия требованиям
      return date.toUTCString().replace('GMT', 'UTC');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* --- УВЕДОМЛЕНИЯ (TOASTS) --- */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xl transition-all duration-300 transform translate-x-0 ${
              n.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900/95 border-red-500/30 text-red-300'
            }`}
          >
            {n.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm font-medium">{n.message}</div>
            <button
              onClick={() => setNotifications((prev) => prev.filter((item) => item.id !== n.id))}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* --- ШАПКА ПРИЛОЖЕНИЯ --- */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-violet-600 rounded-xl shadow-lg shadow-brand-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent m-0">
                TicketFlow
              </h1>
              <p className="text-xs text-slate-400">Система учёта внутренних заявок</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {adminToken ? (
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-1.5 pl-3.5">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Администратор
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Выйти
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 transition-all border border-brand-500/10"
              >
                <LogIn className="w-4 h-4" />
                Вход для Администратора
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --- ОСНОВНОЙ КОНТЕНТ --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ЛЕВАЯ КОЛОНКА: Создание заявки */}
        <section className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-violet-500"></div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-brand-400" />
              Новая заявка
            </h2>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Название заявки <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Обновить SSL сертификат"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
                <div className="flex justify-between items-center mt-1.5 text-xs text-slate-500 px-1">
                  <span>От 3 до 120 символов</span>
                  <span className={newTitle.length > 120 ? 'text-red-400' : ''}>
                    {newTitle.length}/120
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Описание заявки
                </label>
                <textarea
                  placeholder="Подробности о проблеме или задаче..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none"
                />
                <div className="flex justify-between items-center mt-1.5 text-xs text-slate-500 px-1">
                  <span>Максимум 1000 символов</span>
                  <span className={newDescription.length > 1000 ? 'text-red-400' : ''}>
                    {newDescription.length}/1000
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Приоритет
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  >
                    <option value="low">Низкий</option>
                    <option value="normal">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Статус
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  >
                    <option value="new">Новая</option>
                    <option value="in_progress">В процессе</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={createLoading}
                className="w-full py-3 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-brand-500/10 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {createLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Создать заявку
              </button>
            </form>
          </div>

          {/* Информационный блок */}
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-5 text-xs text-slate-400 space-y-3">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Бизнес-правила системы:</h3>
            <ul className="space-y-2 list-disc list-inside">
              <li>Поиск, сортировка и пагинация выполняются на сервере.</li>
              <li>Заявки со статусом <span className="text-emerald-400 font-medium">Выполнено (done)</span> заблокированы для изменения и удаления.</li>
              <li>Нельзя перевести заявку из статуса «Выполнено» в любой другой статус.</li>
              <li>Удаление заявок доступно только администратору <code className="bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-200">admin:admin</code>.</li>
            </ul>
          </div>
        </section>

        {/* ПРАВАЯ КОЛОНКА: Списки, Фильтры и Сортировка */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          
          {/* ФИЛЬТРЫ И ПОИСК */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm flex flex-col gap-4">
            
            {/* Поиск */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Поиск по названию или описанию..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-200 text-xs"
                >
                  Очистить
                </button>
              )}
            </div>

            {/* Фильтры и Сортировка */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  Статус
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-all"
                >
                  <option value="">Все статусы</option>
                  <option value="new">Новая</option>
                  <option value="in_progress">В процессе</option>
                  <option value="done">Выполнено</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  Приоритет
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-all"
                >
                  <option value="">Все приоритеты</option>
                  <option value="low">Низкий</option>
                  <option value="normal">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  Сортировка
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-all"
                >
                  <option value="created_at">Дата создания</option>
                  <option value="priority">Приоритет</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  Порядок
                </label>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="w-full flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 hover:border-slate-700 focus:outline-none transition-all"
                >
                  <span>{sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

            </div>

          </div>

          {/* СПИСОК ЗАЯВОК */}
          <div className="flex-1 flex flex-col gap-4">
            {loading ? (
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                <p className="text-slate-400 text-sm font-medium">Загрузка списка заявок...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-slate-900/20 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
                <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-slate-300 font-semibold mb-1 text-sm">Заявки не найдены</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  Попробуйте изменить параметры фильтрации или поисковый запрос
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => {
                  const isDone = ticket.status === 'done';
                  return (
                    <div
                      key={ticket.id}
                      className={`group relative bg-slate-900/40 hover:bg-slate-900/70 border rounded-2xl p-5 transition-all duration-200 ${
                        isDone 
                          ? 'border-slate-800/80 bg-slate-950/40 opacity-75' 
                          : 'border-slate-800 hover:border-slate-750'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          
                          {/* Хедер карточки: ID, Даты */}
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-semibold">
                            <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              #{ticket.id}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-600" />
                              Создано: {formatDate(ticket.created_at)}
                            </span>
                            {ticket.created_at !== ticket.updated_at && (
                              <span className="text-slate-600">
                                (Обновлено: {formatDate(ticket.updated_at)})
                              </span>
                            )}
                          </div>

                          {/* Заголовок */}
                          <h3 className={`text-base font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                            {ticket.title}
                          </h3>

                          {/* Описание */}
                          {ticket.description && (
                            <p className="text-sm text-slate-400 whitespace-pre-wrap font-normal leading-relaxed max-w-2xl">
                              {ticket.description}
                            </p>
                          )}

                          {/* Теги приоритета и статуса */}
                          <div className="flex flex-wrap gap-2 pt-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadge(ticket.priority)}`}>
                              Приоритет: {getPriorityLabel(ticket.priority)}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(ticket.status)}`}>
                              Статус: {getStatusLabel(ticket.status)}
                            </span>
                          </div>

                        </div>

                        {/* Действия с заявкой */}
                        <div className="flex flex-row md:flex-col items-center justify-between md:justify-start md:items-end gap-3 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                          
                          {/* Быстрое обновление статуса */}
                          <div className="flex flex-col items-start md:items-end gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Изменить статус
                            </span>
                            <select
                              value={ticket.status}
                              disabled={isDone}
                              onChange={(e) => handleStatusChange(ticket.id, e.target.value as any)}
                              className={`bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500 transition-all ${
                                isDone 
                                  ? 'cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500' 
                                  : 'border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <option value="new">Новая</option>
                              <option value="in_progress">В процессе</option>
                              <option value="done">Выполнено</option>
                            </select>
                          </div>

                          {/* Кнопка удаления */}
                          <div className="flex items-center gap-2 mt-auto md:mt-2">
                            <button
                              onClick={() => handleDeleteTicket(ticket.id)}
                              disabled={isDone || !adminToken}
                              title={
                                isDone
                                  ? 'Выполненные заявки нельзя удалять'
                                  : !adminToken
                                  ? 'Необходимы права администратора'
                                  : 'Удалить заявку'
                              }
                              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all ${
                                isDone
                                  ? 'bg-slate-950/20 border-slate-900 text-slate-600 cursor-not-allowed'
                                  : !adminToken
                                  ? 'bg-slate-950/20 border-slate-800 text-slate-500 cursor-not-allowed hover:bg-slate-900 hover:text-slate-400'
                                  : 'bg-red-500/10 border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {!adminToken && <Lock className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                              <span>Удалить</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ПАГИНАЦИЯ */}
            {metadata.pages > 1 && (
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 mt-2">
                <span className="text-xs text-slate-400">
                  Показано: <span className="font-semibold text-slate-200">{tickets.length}</span> из{' '}
                  <span className="font-semibold text-slate-200">{metadata.total}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-850 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: metadata.pages }, (_, i) => i + 1).map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        pNum === page
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                          : 'border border-slate-850 hover:border-slate-750 bg-slate-950/30 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage((p) => Math.min(metadata.pages, p + 1))}
                    disabled={page === metadata.pages}
                    className="p-1.5 rounded-lg border border-slate-850 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* --- МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ АДМИНИСТРАТОРА --- */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowLoginModal(false);
                setLoginError(null);
                setLoginUsername('');
                setLoginPassword('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand-500/10 text-brand-400 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Вход для Администратора</h3>
                <p className="text-xs text-slate-400">Авторизация необходима только для удаления заявок</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Имя пользователя (Логин)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Введите admin"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Пароль
                </label>
                <input
                  type="password"
                  required
                  placeholder="Введите admin"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-950 border border-slate-805 rounded-xl text-[11px] text-slate-400 leading-relaxed">
                Для тестирования используйте стандартные данные:
                <div className="flex gap-4 mt-1 font-semibold text-slate-300">
                  <span>Логин: <code className="bg-slate-800/80 px-1 py-0.5 rounded text-white">admin</code></span>
                  <span>Пароль: <code className="bg-slate-800/80 px-1 py-0.5 rounded text-white">admin</code></span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Войти в аккаунт
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
