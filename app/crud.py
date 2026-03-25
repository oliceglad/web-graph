from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models, schemas
from app.auth import get_password_hash

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(models.User).where(models.User.email == email))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def update_user(db: AsyncSession, user_id: int, user_update: schemas.UserUpdate):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    db_user = result.scalars().first()
    if not db_user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        hashed_password = get_password_hash(update_data["password"])
        db_user.hashed_password = hashed_password
        del update_data["password"]
    
    if "email" in update_data:
        db_user.email = update_data["email"]
        del update_data["email"]
        
    # All remaining fields go into profile_data JSONB
    # Make a copy of existing so SQLAlchemy detects changes on the JSON column
    new_profile_data = dict(db_user.profile_data) if db_user.profile_data else {}
    for key, value in update_data.items():
        if value is not None:
            new_profile_data[key] = value
            
    db_user.profile_data = new_profile_data
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_projects(db: AsyncSession, user_id: int):
    result = await db.execute(select(models.Project).where(models.Project.owner_id == user_id))
    return result.scalars().all()

async def create_project(db: AsyncSession, project: schemas.ProjectCreate, user_id: int):
    db_project = models.Project(title=project.title, owner_id=user_id)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def get_project(db: AsyncSession, project_id: int):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    return result.scalars().first()

async def update_project(db: AsyncSession, project_id: int, project_update: schemas.ProjectUpdate):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    db_project = result.scalars().first()
    if not db_project:
        return None
    
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
    
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def update_share_settings(db: AsyncSession, project_id: int, settings: schemas.ShareSettings):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalars().first()
    if project:
        project.is_public = settings.is_public
        project.public_access_level = settings.public_access_level
        db.add(project)
        await db.commit()
        await db.refresh(project)
    return project

async def delete_project(db: AsyncSession, project_id: int):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalars().first()
    if project:
        await db.delete(project)
        await db.commit()
    return project

async def update_project_graph(db: AsyncSession, project_id: int, graph_data: dict, user_id: Optional[int] = None):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalars().first()
    if not project:
        return None
    project.graph_data = graph_data
    db.add(project)
    # Add to version history
    version = models.VersionHistory(
        project_id=project_id,
        graph_data=graph_data,
        created_by=user_id
    )
    db.add(version)
    await db.commit()
    await db.refresh(project)
    return project
