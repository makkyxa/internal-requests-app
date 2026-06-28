from fastapi import FastAPI, Depends, HTTPException, Query, Header, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import math

from .database import engine, get_db, Base
from . import crud, schemas, models

# Создаем таблицы базы данных при старте
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Система Учёта Заявок API",
    description="Backend на FastAPI для управления внутренними заявками"
)

# Настройка CORS для работы с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все источники для простоты локальной разработки
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Захардкоженный токен администратора для проверки удаления
ADMIN_TOKEN = "admin-token-secret-12345"

def verify_admin_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Для этой операции требуется авторизация администратора. Пожалуйста, войдите в систему."
        )
    token = authorization.split(" ")[1]
    if token != ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен авторизации администратора."
        )
    return True

@app.post("/api/login", response_model=schemas.LoginResponse, tags=["Auth"])
def login(payload: schemas.LoginRequest):
    if payload.username == "admin" and payload.password == "admin":
        return schemas.LoginResponse(token=ADMIN_TOKEN, username="admin")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверное имя пользователя или пароль."
    )

@app.get("/api/tickets", response_model=schemas.TicketListResponse, tags=["Tickets"])
def read_tickets(
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(10, ge=1, le=100, description="Количество элементов на странице"),
    status_filter: Optional[str] = Query(None, alias="status", description="Фильтр по статусу"),
    priority_filter: Optional[str] = Query(None, alias="priority", description="Фильтр по приоритету"),
    search: Optional[str] = Query(None, description="Поиск по названию и описанию"),
    sort_by: str = Query("created_at", description="Поле сортировки (created_at или priority)"),
    sort_order: str = Query("desc", description="Направление сортировки (asc или desc)"),
    db: Session = Depends(get_db)
):
    if status_filter and status_filter not in ["new", "in_progress", "done"]:
        raise HTTPException(status_code=400, detail="Неверное значение фильтра статуса.")
    if priority_filter and priority_filter not in ["low", "normal", "high"]:
        raise HTTPException(status_code=400, detail="Неверное значение фильтра приоритета.")
    if sort_by not in ["created_at", "priority"]:
        raise HTTPException(status_code=400, detail="Сортировка возможна только по created_at или priority.")
    if sort_order not in ["asc", "desc"]:
        raise HTTPException(status_code=400, detail="Направление сортировки может быть только asc или desc.")

    items, total = crud.get_tickets(
        db=db,
        page=page,
        limit=limit,
        status=status_filter,
        priority=priority_filter,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order
    )

    pages = math.ceil(total / limit) if total > 0 else 1

    return schemas.TicketListResponse(
        items=[schemas.TicketResponse.model_validate(item) for item in items],
        metadata=schemas.PaginationMetadata(
            total=total,
            page=page,
            limit=limit,
            pages=pages
        )
    )

@app.post("/api/tickets", response_model=schemas.TicketResponse, status_code=status.HTTP_201_CREATED, tags=["Tickets"])
def create_ticket(ticket: schemas.TicketCreate, db: Session = Depends(get_db)):
    return crud.create_ticket(db=db, ticket=ticket)

@app.get("/api/tickets/{ticket_id}", response_model=schemas.TicketResponse, tags=["Tickets"])
def read_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена.")
    return db_ticket

@app.patch("/api/tickets/{ticket_id}", response_model=schemas.TicketResponse, tags=["Tickets"])
def update_ticket(
    ticket_id: int, 
    ticket_update: schemas.TicketUpdate, 
    db: Session = Depends(get_db)
):
    db_ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена.")
    
    # Бизнес-правило: Заявку в статусе "done" НЕЛЬЗЯ редактировать
    if db_ticket.status == "done":
        raise HTTPException(
            status_code=400, 
            detail="Заявку в статусе 'done' нельзя редактировать или изменять."
        )
    
    return crud.update_ticket(db=db, db_ticket=db_ticket, ticket_update=ticket_update)

@app.delete("/api/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Tickets"])
def delete_ticket(
    ticket_id: int, 
    db: Session = Depends(get_db),
    _admin_auth: bool = Depends(verify_admin_token)
):
    db_ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена.")
    
    # Бизнес-правило: Заявку в статусе "done" НЕЛЬЗЯ удалять
    if db_ticket.status == "done":
        raise HTTPException(
            status_code=400, 
            detail="Заявку в статусе 'done' нельзя удалить."
        )
        
    crud.delete_ticket(db=db, db_ticket=db_ticket)
    return
