"""
TalkaNova FastAPI application (NO AUTH VERSION).
- General Chat: Server-based WebSocket with message persistence
- Private Chat: P2P signaling via Tailscale
- Identity: Ephemeral (client-side UUID + pseudo)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import init_db
from app.routers import ws_general, p2p, rooms, messages, reports, help, files

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    description="Anonymous E2EE messaging with server-based general chat and P2P private chat",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Core features (NO AUTH)
app.include_router(rooms.router, prefix=settings.api_prefix)
app.include_router(messages.router, prefix=settings.api_prefix)
app.include_router(reports.router, prefix=settings.api_prefix)
app.include_router(help.router, prefix=settings.api_prefix)
app.include_router(files.router, prefix=settings.api_prefix)

# P2P signaling
app.include_router(p2p.router, prefix=settings.api_prefix)

# General Chat (Broadcast WebSocket)
app.include_router(ws_general.router, prefix=settings.api_prefix)


@app.get("/")
async def root():
    return {"app": "TalkaNova", "version": "1.0.0", "auth": "none"}
