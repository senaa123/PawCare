import uuid

from fastapi import APIRouter
from typing import List

from app.api.dependencies import DBSession, CurrentUser
from app.database.schemas.cat import CatCreate, CatUpdate, CatOut
from app.services.cat_service import CatService

router = APIRouter()


@router.get("/", response_model=List[CatOut])
async def list_cats(current_user: CurrentUser, session: DBSession):
    return await CatService(session).list_cats(current_user.id)


@router.post("/", response_model=CatOut, status_code=201)
async def create_cat(data: CatCreate, current_user: CurrentUser, session: DBSession):
    return await CatService(session).create_cat(data, current_user.id)


@router.get("/{cat_id}", response_model=CatOut)
async def get_cat(cat_id: uuid.UUID, current_user: CurrentUser, session: DBSession):
    return await CatService(session).get_cat(cat_id, current_user.id)


@router.patch("/{cat_id}", response_model=CatOut)
async def update_cat(cat_id: uuid.UUID, data: CatUpdate, current_user: CurrentUser, session: DBSession):
    return await CatService(session).update_cat(cat_id, data, current_user.id)


@router.delete("/{cat_id}", status_code=204)
async def delete_cat(cat_id: uuid.UUID, current_user: CurrentUser, session: DBSession):
    await CatService(session).delete_cat(cat_id, current_user.id)