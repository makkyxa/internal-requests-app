import datetime
from sqlalchemy import Column, Integer, String, DateTime
from .database import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(120), nullable=False)
    description = Column(String(1000), nullable=True)
    status = Column(String(20), default="new", nullable=False)  # "new", "in_progress", "done"
    priority = Column(String(20), default="normal", nullable=False)  # "low", "normal", "high"
    created_at = Column(
        DateTime, 
        default=lambda: datetime.datetime.now(datetime.timezone.utc), 
        nullable=False
    )
    updated_at = Column(
        DateTime, 
        default=lambda: datetime.datetime.now(datetime.timezone.utc), 
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), 
        nullable=False
    )
