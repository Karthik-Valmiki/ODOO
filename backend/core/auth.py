import os
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import bcrypt
import jwt
from django.conf import settings
from ninja.security import HttpBearer
from ninja.errors import HttpError
from core.models import User

JWT_SECRET = getattr(settings, "SECRET_KEY", "workdesk-secret-key-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRE_MINUTES", "1440"))  # 24 hours for dev/hackathon convenience
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "7"))


def hash_password(password: str) -> str:
    """Hash plaintext password with bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generate JWT access token."""
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generate JWT refresh token."""
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HttpError(401, "Token has expired")
    except jwt.InvalidTokenError:
        raise HttpError(401, "Invalid token")


def generate_temp_password(length: int = 10) -> str:
    """Generate a clean and secure temporary password."""
    alphabet = string.ascii_letters + string.digits + "@#$%"
    # Ensure at least one uppercase, one digit, one special char
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("@#$%"),
    ]
    for _ in range(length - 4):
        password.append(secrets.choice(alphabet))
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


class JWTAuth(HttpBearer):
    """
    Bearer Token Authentication for Django Ninja.
    Attaches the authenticated `User` model instance to `request.auth`.
    """
    def authenticate(self, request, token: str) -> Optional[User]:
        try:
            payload = decode_token(token)
            if payload.get("type") != "access":
                raise HttpError(401, "Invalid token type")
            user_id = payload.get("sub")
            if not user_id:
                raise HttpError(401, "Token missing user identifier")
            user = User.objects.select_related("profile").get(id=user_id)
            return user
        except User.DoesNotExist:
            raise HttpError(401, "User not found")
        except HttpError:
            raise
        except Exception:
            raise HttpError(401, "Authentication failed")


jwt_auth = JWTAuth()


def require_admin(request) -> User:
    """Helper to assert authenticated user has ADMIN role."""
    user = getattr(request, "auth", None)
    if not user or user.role != "ADMIN":
        raise HttpError(403, "Admin privileges required for this action")
    return user
