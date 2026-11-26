from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

import crud.user as crud_user
from core.security import decode_token
from database.session import get_db
from models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    payload = decode_token(token)
    user = crud_user.get_user_by_username(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token.")
    return user
