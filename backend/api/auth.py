"""
auth.py — JWT authentication router.
Provides /token (login), /users/me, and the get_current_user dependency
that enforces JWT on all protected routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    oauth2_scheme,
)

router = APIRouter()

# ── Mock user database (replace with real DB in production) ─────────────────
# Roles: "admin" | "operator"
USERS_DB = {
    "admin": {
        "username": "admin",
        "full_name": "Admin User",
        "hashed_password": get_password_hash("admin"),
        "role": "admin",
        "disabled": False,
    },
    "operator": {
        "username": "operator",
        "full_name": "Grid Operator",
        "hashed_password": get_password_hash("operator"),
        "role": "operator",
        "disabled": False,
    },
}


# ── Pydantic schemas ─────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


class UserOut(BaseModel):
    username: str
    full_name: str
    role: str


# ── Helper dependency ────────────────────────────────────────────────────────
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency — decodes JWT and returns the user dict.
    Raises 401 if the token is invalid or the user is not found/disabled.
    """
    payload = decode_access_token(token)
    username: Optional[str] = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid token payload")

    user = USERS_DB.get(username)
    if user is None or user.get("disabled"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="User not found or disabled")
    return user


def require_role(required_role: str):
    """Factory for role-gated dependencies."""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires '{required_role}' role"
            )
        return current_user
    return role_checker


# ── Routes ───────────────────────────────────────────────────────────────────
@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate with username + password → returns a JWT access token."""
    user = USERS_DB.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password"
        )

    token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    return Token(
        access_token=token,
        token_type="bearer",
        role=user["role"],
        username=user["username"]
    )


@router.get("/users/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return UserOut(**current_user)
