import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, projects
from app.websockets import manager

app = FastAPI(title="Graph Editor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])


@app.get("/")
async def root():
    return {"message": "Welcome to Graph Editor API"}


@app.websocket("/ws/{project_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    project_id: str,
    client_id: str = Query(default=""),
    username: str = Query(default="Гость")
):
    await manager.connect(websocket, project_id, client_id, username)
    try:
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)
            await manager.broadcast(project_id, msg_data, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
        # Broadcast updated presence after disconnect
        await manager._broadcast_presence(project_id)
        await manager.broadcast(project_id, {"type": "user_left"})
