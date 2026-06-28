from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator

class TicketBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=120, description="Название заявки")
    description: Optional[str] = Field(None, max_length=1000, description="Описание заявки")
    status: Literal["new", "in_progress", "done"] = Field("new", description="Статус заявки")
    priority: Literal["low", "normal", "high"] = Field("normal", description="Приоритет заявки")

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[Literal["new", "in_progress", "done"]] = None
    priority: Optional[Literal["low", "normal", "high"]] = None

class TicketResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: Literal["new", "in_progress", "done"]
    priority: Literal["low", "normal", "high"]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PaginationMetadata(BaseModel):
    total: int
    page: int
    limit: int
    pages: int

class TicketListResponse(BaseModel):
    items: List[TicketResponse]
    metadata: PaginationMetadata

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str
