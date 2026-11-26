from datetime import datetime, timedelta, timezone
from functools import lru_cache
import hashlib
from os import getenv
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException, status
import jwt
from jwt.algorithms import RSAAlgorithm
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()
ALGORITHM = "RS256"
DEFAULT_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# cache the generated return value in memory.
# `maxsize=1` such that only a single keypair can ever be cached.
@lru_cache(maxsize=1)
def _get_signing_keys() -> tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey, str, dict]:
    """Load an RSA private key from JWT_PRIVATE_KEY_PATH or generate an ephemeral RSA-2048 keypair."""
    key_path_env = getenv("JWT_PRIVATE_KEY_PATH")
    if key_path_env:
        key_path = Path(key_path_env)
        try:
            private_key = serialization.load_pem_private_key(
                key_path.read_bytes(), password=None
            )
        except (OSError, ValueError) as e:
            raise RuntimeError(f"Could not load JWT private key '{key_path}': {e}") from e
        if not isinstance(private_key, rsa.RSAPrivateKey):
            raise RuntimeError("JWT private key must be an RSA key.")
    else:
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    public_key = private_key.public_key()
    pub_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    # hash using SHA256, then grab the first 16 characters to act as the unique, deterministic id of the public key
    kid = hashlib.sha256(pub_der).hexdigest()[:16]
    # turn the public key into a dictionary matching the JWK format: {"kty": "RSA", "n": "...", "e": "..."}
    # n: modulus, e: public exponent
    jwk = RSAAlgorithm.to_jwk(public_key, as_dict=True)
    # attach additional fields to the JWK dictionary.
    # use: "sig" - intended usage is for verifying the signature of a payload signed with the private key.
    # kid - the unique identifier for the public key. The frontend uses this to check if the public key has been refreshed.
    jwk.update({"use": "sig", "alg": ALGORITHM, "kid": kid})
    return private_key, public_key, kid, jwk


def get_jwks() -> dict:
    _, _, _, jwk = _get_signing_keys()
    return {"keys": [jwk]}


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=DEFAULT_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    private_key, _, kid, _ = _get_signing_keys()
    return jwt.encode(
        to_encode,
        private_key,
        algorithm=ALGORITHM,
        headers={"kid": kid},
    )


def decode_token(token: str) -> dict:
    _, public_key, _, _ = _get_signing_keys()
    try:
        payload = jwt.decode(token, public_key, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token."
            )
        return payload
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token."
        )
