from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, case
import datetime

from . import models, schemas

def get_ticket(db: Session, ticket_id: int) -> Optional[models.Ticket]:
    return db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()

def get_tickets(
    db: Session,
    page: int = 1,
    limit: int = 10,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
) -> Tuple[List[models.Ticket], int]:
    query = db.query(models.Ticket)

    # 1. Фильтрация
    if status:
        query = query.filter(models.Ticket.status == status)
    if priority:
        query = query.filter(models.Ticket.priority == priority)

    # 2. Поиск
    if search:
        search_filter = or_(
            models.Ticket.title.ilike(f"%{search}%"),
            models.Ticket.description.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    # Получаем общее количество записей ДО пагинации
    total = query.count()

    # 3. Сортировка
    if sort_by == "priority":
        # low = 1, normal = 2, high = 3
        priority_order = case(
            (models.Ticket.priority == "low", 1),
            (models.Ticket.priority == "normal", 2),
            (models.Ticket.priority == "high", 3),
            else_=0
        )
        if sort_order == "desc":
            query = query.order_by(priority_order.desc(), models.Ticket.created_at.desc())
        else:
            query = query.order_by(priority_order.asc(), models.Ticket.created_at.desc())
    else:  # По умолчанию created_at
        if sort_order == "asc":
            query = query.order_by(models.Ticket.created_at.asc())
        else:
            query = query.order_by(models.Ticket.created_at.desc())

    # 4. Пагинация
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    return items, total

def create_ticket(db: Session, ticket: schemas.TicketCreate) -> models.Ticket:
    db_ticket = models.Ticket(
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def update_ticket(db: Session, db_ticket: models.Ticket, ticket_update: schemas.TicketUpdate) -> models.Ticket:
    update_data = ticket_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_ticket, key, value)
        
    db_ticket.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def delete_ticket(db: Session, db_ticket: models.Ticket) -> None:
    db.delete(db_ticket)
    db.commit()
