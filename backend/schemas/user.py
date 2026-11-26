from pydantic import BaseModel, ConfigDict, Field


class UserCreateSchema(BaseModel):
    username: str = Field(min_length=4, max_length=32, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(min_length=8, max_length=64)


class UserReadSchema(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)


class UserRegisterLoginSchema(BaseModel):
    user: UserReadSchema
    access_token: str
    token_type: str = "bearer"
