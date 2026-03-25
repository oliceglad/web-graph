from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_data = Column(JSON, default={})
    
    projects = relationship("Project", back_populates="owner")
    access_rights = relationship("AccessRight", back_populates="user")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    graph_data = Column(JSON, default={"nodes": [], "edges": []})
    is_public = Column(Boolean, default=False, server_default="false")
    public_access_level = Column(String, default="view", server_default="view")
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="projects")
    access_rights = relationship("AccessRight", back_populates="project", cascade="all, delete-orphan")
    version_history = relationship("VersionHistory", back_populates="project", cascade="all, delete-orphan")

class AccessRight(Base):
    __tablename__ = "access_rights"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    role = Column(String, nullable=False) # "editor", "reader"
    
    user = relationship("User", back_populates="access_rights")
    project = relationship("Project", back_populates="access_rights")

class VersionHistory(Base):
    __tablename__ = "version_history"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    graph_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))

    project = relationship("Project", back_populates="version_history")
