import uuid
import logging
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.database.models.cat import Cat
from app.database.repositories.cat_repository import CatRepository
from app.database.schemas.cat import CatCreate, CatUpdate

logger = logging.getLogger(__name__)


class CatService:
    def __init__(self, session: AsyncSession):
        self.repo = CatRepository(session)

    async def list_cats(self, owner_id: uuid.UUID) -> Sequence[Cat]:
        return await self.repo.get_by_owner(owner_id)

    async def get_cat(self, cat_id: uuid.UUID, owner_id: uuid.UUID) -> Cat:
        cat = await self.repo.get_by_id_and_owner(cat_id, owner_id)
        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cat not found")
        return cat

    async def create_cat(self, data: CatCreate, owner_id: uuid.UUID) -> Cat:
        cat = Cat(owner_id=owner_id, **data.model_dump())
        return await self.repo.create(cat)

    async def update_cat(self, cat_id: uuid.UUID, data: CatUpdate, owner_id: uuid.UUID) -> Cat:
        cat = await self.get_cat(cat_id, owner_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(cat, field, value)
        return cat

    async def delete_cat(self, cat_id: uuid.UUID, owner_id: uuid.UUID) -> None:
        cat = await self.get_cat(cat_id, owner_id)
        deleted = await self.repo.delete(cat.id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cat not found")