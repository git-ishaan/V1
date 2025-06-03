# main.py
import os
from typing import Dict, Set, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from expo_server_sdk import Expo, ExpoPushError, ExpoPushMessage

app = FastAPI()

# ─── In‐Memory Store (for demo) ────────────────────────────────────────────────
# In production, replace this with a real DB (Postgres, Redis, etc.)
USER_TOKENS: Dict[str, Set[str]] = {}
# Key: userId (string)
# Value: set of Expo Push Token strings, e.g. {"ExponentPushToken[abcd...]", ...}


# ─── Pydantic Models ────────────────────────────────────────────────────────────
class SavePushTokenRequest(BaseModel):
    userId: str = Field(..., description="Your app’s user or installation ID")
    token: str = Field(..., description="Expo Push Token (e.g. ExponentPushToken[xxxx])")


class InfluxAlertPayload(BaseModel):
    id: Optional[str] = Field(None, description="Some alert ID or name")
    message: Optional[str] = Field(None, description="Alert message content")
    time: Optional[str] = Field(None, description="Timestamp of alert (ISO string)")
    tags: Dict[str, str] = Field(
        ..., description="E.g. { 'userId': 'user123', ... }"
    )
    fields: Dict[str, float] = Field(
        default_factory=dict, description="Any numeric fields (e.g. { 'value': 78.5 })"
    )


# ─── Helper: Send Push via Expo ─────────────────────────────────────────────────
def send_push_notification(
    expo_push_token: str, title: str, body: str, data: Optional[Dict] = None
) -> List[dict]:
    """
    Uses expo-server-sdk to send one push notification.
    Returns the list of receipts from Expo (one receipt per message).
    """
    expo_auth_token = os.getenv("EXPO_PUSH_AUTH_TOKEN")
    if not expo_auth_token:
        raise RuntimeError(
            "EXPO_PUSH_AUTH_TOKEN is not set in environment. Export it first:\n"
            "  export EXPO_PUSH_AUTH_TOKEN=<your-expo-push-auth-token>"
        )

    expo_client = Expo(access_token=expo_auth_token)

    if not Expo.is_expo_push_token(expo_push_token):
        raise ValueError(f"Invalid Expo Push Token: {expo_push_token!r}")

    msg = ExpoPushMessage(
        to=expo_push_token,
        sound="default",
        title=title,
        body=body,
        data=data or {},
    )

    # Expo enforces batches of ≤100 messages, so we chunk even if it’s just one.
    chunks = expo_client.chunk_push_notifications([msg])
    all_receipts = []

    for chunk in chunks:
        try:
            receipts = expo_client.send_push_notifications(chunk)
            all_receipts.extend(receipts)
        except ExpoPushError as err:
            # You can inspect err.details or err.messages to log more info.
            raise RuntimeError(f"Error sending push notification: {err}")

    return all_receipts


# ─── Endpoint: Save Push Token ───────────────────────────────────────────────────
@app.post("/api/save-push-token", status_code=200)
async def save_push_token(req: SavePushTokenRequest):
    """
    Receives { userId, token } from the Expo app.
    Stores it in memory for later pushes.
    """
    user_id = req.userId
    token = req.token

    # Basic validation
    if not user_id or not token:
        raise HTTPException(status_code=400, detail="`userId` and `token` required")

    # Add token to the user’s set
    USER_TOKENS.setdefault(user_id, set()).add(token)
    print(f"→ Saved token for user {user_id}: {token}")

    return {"success": True}


# ─── Endpoint: InfluxDB Alert Webhook ────────────────────────────────────────────
@app.post("/api/influx-alerts", status_code=200)
async def influx_alerts(payload: InfluxAlertPayload):
    """
    Simulates InfluxDB posting an alert:
    {
      "id": "temperature_high",
      "message": "CPU Temp > 75°C!",
      "time": "2025-06-01T14:20:00Z",
      "tags": { "userId": "user123", ... },
      "fields": { "value": 78.5 }
    }
    """

    user_id = payload.tags.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing `tags.userId` in payload")

    tokens = USER_TOKENS.get(user_id, set())
    if not tokens:
        # No tokens registered for that user—nothing to do
        return {"success": True, "message": "No push tokens for this user"}

    # Build notification content
    alert_id = payload.id or "Influx Alert"
    alert_message = payload.message or "An alert was triggered."
    fields = payload.fields or {}
    timestamp = payload.time or ""

    title = f"Influx Alert: {alert_id}"
    body = alert_message
    data = {"value": fields.get("value"), "time": timestamp}

    receipts = []
    for token in tokens:
        try:
            rcpts = send_push_notification(token, title, body, data)
            receipts.extend(rcpts)
        except Exception as e:
            # Log the error but continue with other tokens
            print(f"⚠️  Failed to send to {token}: {e}")

    return {"success": True, "receipts": receipts}


# ─── (Optional) Simple Root ­Endpoint ─────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "FastAPI Expo Push Example is running."}
