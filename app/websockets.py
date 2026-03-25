import os
import json
import asyncio
from fastapi import WebSocket
from redis.asyncio import Redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[dict]] = {}  # {doc_id: [{ws, client_id, username, color}]}
        self.redis = Redis.from_url(REDIS_URL)

    COLORS = [
        "#6366f1", "#ec4899", "#f59e0b", "#10b981",
        "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
        "#f97316", "#06b6d4", "#a855f7", "#84cc16"
    ]

    async def connect(self, websocket: WebSocket, document_id: str, client_id: str = "", username: str = "Гость"):
        await websocket.accept()
        if document_id not in self.active_connections:
            self.active_connections[document_id] = []
            asyncio.create_task(self._listen_to_redis(document_id))

        color_index = len(self.active_connections[document_id]) % len(self.COLORS)
        conn_info = {
            "ws": websocket,
            "client_id": client_id,
            "username": username,
            "color": self.COLORS[color_index]
        }
        self.active_connections[document_id].append(conn_info)

        # Broadcast presence update to all in the room
        await self._broadcast_presence(document_id)

    def disconnect(self, websocket: WebSocket, document_id: str):
        if document_id in self.active_connections:
            self.active_connections[document_id] = [
                c for c in self.active_connections[document_id] if c["ws"] != websocket
            ]
            if not self.active_connections[document_id]:
                del self.active_connections[document_id]

    async def broadcast(self, document_id: str, message: dict, sender: WebSocket = None):
        msg_str = json.dumps(message)
        await self.redis.publish(f"document:{document_id}", msg_str)

    async def _broadcast_presence(self, document_id: str):
        """Send current list of active users to all connections in this document."""
        conns = self.active_connections.get(document_id, [])
        users = [
            {"client_id": c["client_id"], "username": c["username"], "color": c["color"]}
            for c in conns
        ]
        presence_msg = json.dumps({"type": "presence", "users": users})
        for conn in conns:
            try:
                await conn["ws"].send_text(presence_msg)
            except Exception:
                pass

    async def _listen_to_redis(self, document_id: str):
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(f"document:{document_id}")
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"].decode("utf-8")
                    websockets = self.active_connections.get(document_id, [])
                    for conn in websockets:
                        try:
                            await conn["ws"].send_text(data)
                        except Exception:
                            pass
        except asyncio.CancelledError:
            await pubsub.unsubscribe(f"document:{document_id}")
            await pubsub.close()


manager = ConnectionManager()
