from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app import schemas, crud, models
from app.auth import get_current_user

router = APIRouter()


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_session)
):
    """Try to get user from token, return None if not authenticated."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        from app.auth import oauth2_scheme, get_current_user as _get
        from jose import jwt, JWTError
        import os
        SECRET_KEY = os.getenv("SECRET_KEY", "secret")
        ALGORITHM = os.getenv("ALGORITHM", "HS256")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        user = await crud.get_user_by_email(db, email=email)
        return user
    except Exception:
        return None


@router.post("/", response_model=schemas.ProjectResponse)
async def create_project(
    project: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    return await crud.create_project(db=db, project=project, user_id=current_user.id)


@router.get("/", response_model=List[schemas.ProjectResponse])
async def read_projects(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    return await crud.get_projects(db, user_id=current_user.id)


@router.get("/{project_id}", response_model=schemas.ProjectResponse)
async def read_project(
    project_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    project = await crud.get_project(db, project_id=project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Проект не найден")
    # Allow if public or if user is owner
    if not project.is_public and (current_user is None or current_user.id != project.owner_id):
        raise HTTPException(status_code=403, detail="Нет доступа к проекту")
    return project


@router.put("/{project_id}", response_model=schemas.ProjectResponse)
async def update_project(
    project_id: int,
    project_update: schemas.ProjectUpdate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    project = await crud.get_project(db, project_id=project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Проект не найден")
    if current_user.id != project.owner_id:
        raise HTTPException(status_code=403, detail="Только владелец может менять данные проекта")
    return await crud.update_project(db, project_id=project_id, project_update=project_update)


@router.put("/{project_id}/graph", response_model=schemas.ProjectResponse)
async def update_project_graph(
    project_id: int,
    graph_data: dict,
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    project = await crud.get_project(db, project_id=project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Проект не найден")
    # Allow if owner, or if public with edit access
    is_owner = current_user and current_user.id == project.owner_id
    is_public_edit = project.is_public and project.public_access_level == "edit"
    if not is_owner and not is_public_edit:
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    user_id = current_user.id if current_user else None
    return await crud.update_project_graph(db, project_id=project_id, graph_data=graph_data, user_id=user_id)


@router.put("/{project_id}/share", response_model=schemas.ProjectResponse)
async def update_share_settings(
    project_id: int,
    settings: schemas.ShareSettings,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    project = await crud.get_project(db, project_id=project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Проект не найден")
    if current_user.id != project.owner_id:
        raise HTTPException(status_code=403, detail="Только владелец может менять настройки доступа")
    return await crud.update_share_settings(db, project_id=project_id, settings=settings)


@router.post("/import", response_model=schemas.ProjectResponse)
async def import_project(
    data: dict,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Import a board from .graphboard JSON format."""
    if "title" not in data or "graph_data" not in data:
        raise HTTPException(status_code=400, detail="Неверный формат файла. Ожидаются поля 'title' и 'graph_data'.")
    graph_data = data["graph_data"]
    if not isinstance(graph_data, dict) or "nodes" not in graph_data or "edges" not in graph_data:
        raise HTTPException(status_code=400, detail="Неверная структура graph_data. Ожидаются 'nodes' и 'edges'.")
    project = await crud.create_project(db=db, project=schemas.ProjectCreate(title=data["title"]), user_id=current_user.id)
    return await crud.update_project_graph(db, project_id=project.id, graph_data=graph_data, user_id=current_user.id)


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    project = await crud.get_project(db, project_id=project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Проект не найден")
    if current_user.id != project.owner_id:
        raise HTTPException(status_code=403, detail="Только владелец может удалить проект")
    await crud.delete_project(db, project_id=project_id)
    return {"message": "Проект успешно удален"}
