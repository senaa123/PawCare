from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import DBSession, CurrentUser
from app.database.schemas.user import UserCreate, UserOut, TokenOut, LoginIn
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserCreate, session: DBSession):
    return await AuthService(session).register(data)


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, session: DBSession):
    token = await AuthService(session).login(data.email, data.password)
    return {"access_token": token}


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser):
    return current_user