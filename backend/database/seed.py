from os import getenv

import crud.user as crud_user
from database.session import SessionLocal
from schemas.user import UserCreateSchema


def seed_demo_user() -> None:
    username = getenv("DEMO_USERNAME", "demo").strip()
    password = getenv("DEMO_PASSWORD", "demo1234")
    if not username or not password:
        return
    db = SessionLocal()
    try:
        if not crud_user.get_user_by_username(db, username):
            crud_user.create_user(
                db, UserCreateSchema(username=username, password=password)
            )
    finally:
        db.close()
