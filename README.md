# TicketFlow — Система Учёта Внутренних Заявок

Sleek & modern web application for managing internal tickets and requests, split into a Python/FastAPI backend and a React/TypeScript/TailwindCSS frontend.

---

## 🛠 Технологический стек

- **Backend**: Python 3.12 + FastAPI + SQLAlchemy + SQLite (в качестве базы данных)
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Lucide Icons

---

## 📂 Структура проекта

```
test_tz/
├── backend/                  # Серверная часть (FastAPI)
│   ├── app/                  # Исходный код приложения
│   │   ├── database.py       # Подключение к БД SQLite и сессии
│   │   ├── models.py         # SQLAlchemy модели данных
│   │   ├── schemas.py        # Pydantic-схемы для валидации
│   │   ├── crud.py           # Запросы к БД (фильтры, поиск, пагинация, сортировка)
│   │   └── main.py           # Роуты API и бизнес-правила
│   ├── requirements.txt      # Зависимости Python
│   └── tickets.sqlite        # Файл базы данных SQLite (генерируется при старте)
│
├── frontend/                 # Клиентская часть (React + TypeScript)
│   ├── src/
│   │   ├── App.tsx           # Основной компонент панели управления
│   │   ├── index.css         # Стили TailwindCSS
│   │   └── main.tsx          # Точка входа React
│   ├── index.html            # HTML-каркас и SEO-метатеги
│   ├── tailwind.config.js    # Конфигурация Tailwind CSS
│   └── package.json          # Зависимости Node.js
│
├── .gitignore                # Файл исключений Git (скрывает venv, node_modules, .sqlite)
└── README.md                 # Описание проекта
```

---

## 🚀 Локальный запуск проекта

### 1. Запуск Backend (FastAPI)

Перейдите в папку `backend` в вашем терминале:
```bash
cd backend
```

1. **Создайте и активируйте виртуальное окружение**:
   - **На Windows**:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **На macOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

2. **Установите зависимости**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Запустите сервер**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Сервер запустится по адресу: `http://localhost:8000`
   Интерактивная документация Swagger доступна по адресу: `http://localhost:8000/docs`

---

### 2. Запуск Frontend (React + Vite)

Перейдите в папку `frontend` в новом окне терминала:
```bash
cd frontend
```

1. **Установите зависимости**:
   ```bash
   npm install
   ```

2. **Запустите сервер для разработки**:
   ```bash
   npm run dev -- --port 5173
   ```
   Приложение откроется по адресу: `http://localhost:5173`

---

## 💼 Административный доступ
Для удаления заявок воспользуйтесь кнопкой «Вход для Администратора» в правом верхнем углу интерфейса:
- **Логин**: `admin`
- **Пароль**: `admin`
