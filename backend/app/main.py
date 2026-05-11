from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.models import Product
from app.routers import dashboard, messages, orders, products, shipments, system, tasks
from app.seed import run_seed
from app.routers import chat, ai_tasks, alerts


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(Product).count() == 0:
            run_seed(db)
    yield


app = FastAPI(
    title="SmartFlow AI",
    description="KOBİ ve kooperatifler için yapay zeka operasyon asistanı.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(orders.router)
app.include_router(products.router)
app.include_router(shipments.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)
app.include_router(messages.router)
app.include_router(chat.router)
app.include_router(ai_tasks.router)
app.include_router(alerts.router)
