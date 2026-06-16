import uuid
from typing import List

from fastapi import APIRouter, Query

from app.api.dependencies import DBSession, CurrentUser
from app.database.schemas.alert import AlertCreate, AlertOut
from app.services.alert_service import AlertService

router = APIRouter()


@router.get("/", response_model=List[AlertOut])
async def list_alerts(
    current_user: CurrentUser,
    session: DBSession,
    unread_only: bool = Query(False),
):
    return await AlertService(session).list_alerts(current_user.id, unread_only=unread_only)


@router.post("/", response_model=AlertOut, status_code=201)
async def create_alert(data: AlertCreate, current_user: CurrentUser, session: DBSession):
    return await AlertService(session).create_alert(data, current_user.id)


@router.patch("/{alert_id}/read", status_code=204)
async def mark_alert_read(alert_id: uuid.UUID, current_user: CurrentUser, session: DBSession):
    await AlertService(session).mark_read(alert_id, current_user.id)