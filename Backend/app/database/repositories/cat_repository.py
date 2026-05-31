import uuid
from typing import Sequence, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.cat import Cat
from app.database.repositories.base import BaseRepository

class CatRepository(BaseRepository[Cat]):
    def __init__(self, session: AsyncSession):
        super().__init__(Cat, session)

    async def get_by_owner(self, owner_id: uuid.UUID) -> Sequence[Cat]:
        result = await self.session.execute(
            select(Cat).where(Cat.owner_id == owner_id).order_by(Cat.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_id_and_owner(self, cat_id: uuid.UUID, owner_id: uuid.UUID) -> Optional[Cat]:
        result = await self.session.execute(
            select(Cat).where(Cat.id == cat_id, Cat.owner_id == owner_id)
        )
        return result.scalar_one_or_none()