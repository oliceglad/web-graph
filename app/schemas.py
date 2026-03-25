from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    name: Optional[str] = None
    organization: Optional[str] = None
    industry: Optional[str] = None
    role: Optional[str] = None
    language: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: int
    profile_data: Dict[str, Any]

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    graph_data: Dict[str, Any]
    is_public: Optional[bool] = False
    public_access_level: Optional[str] = "view"

    class Config:
        from_attributes = True

class ShareSettings(BaseModel):
    is_public: bool
    public_access_level: str = "view"  # "view" or "edit"

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
