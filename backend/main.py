from contextlib import asynccontextmanager

from core.security import get_jwks
from database.base import Base
from database.seed import seed_demo_user
from database.session import engine
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import analysis as _analysis_model  # noqa: F401
from models import user as _user_model  # noqa: F401
from routes.analysis import router as analysis_router
from routes.auth import router as auth_router

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # create SQLite tables
    Base.metadata.create_all(bind=engine)
    # generate a demo user
    seed_demo_user()
    yield


app = FastAPI(title="Omisearch API", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(analysis_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/.well-known/jwks.json")
def jwks() -> dict:
    return get_jwks()
