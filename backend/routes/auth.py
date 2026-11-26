from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import crud.user as crud_user
from core.security import create_access_token, hash_password, verify_password
from database.session import get_db
from schemas.user import UserCreateSchema, UserReadSchema, UserRegisterLoginSchema

router = APIRouter(prefix="/auth", tags=["auth"])

# Precomputed once so unknown-user logins don't re-hash on every request.
DUMMY_PASSWORD_HASH = hash_password("dummy")


@router.post("/register", response_model=UserRegisterLoginSchema, status_code=201)
async def register(
    user: Annotated[UserCreateSchema, Body(title="Create User")],
    db: Session = Depends(get_db),
):
    try:
        db_user = crud_user.create_user(db, user)
    except crud_user.UserAlreadyExistsException:
        raise HTTPException(
            status_code=409,
            detail=f"A user with this username ('{user.username}') already exists.",
        )
    access_token = create_access_token(data={"sub": db_user.username})
    return UserRegisterLoginSchema(
        user=UserReadSchema.model_validate(db_user),
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/login", response_model=UserRegisterLoginSchema)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
):
    db_user = crud_user.get_user_by_username(db, form_data.username)
    # Perform a dummy password verification for unknown users to prevent timing attacks.
    hashed_password = db_user.hashed_password if db_user else DUMMY_PASSWORD_HASH
    password_valid = verify_password(form_data.password, hashed_password)
    if not db_user or not password_valid:
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    access_token = create_access_token(data={"sub": db_user.username})
    return UserRegisterLoginSchema(
        user=UserReadSchema.model_validate(db_user),
        access_token=access_token,
        token_type="bearer",
    )
