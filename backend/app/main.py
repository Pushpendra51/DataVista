from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router as main_router
from app.api.analytics import router as analytics_router
from app.api.query import router as query_router
from app.api.clean import router as clean_router
from app.api.export import router as export_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=settings.DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Each router is mounted under /api — separation of concerns per feature
    app.include_router(main_router, prefix=settings.API_PREFIX)
    app.include_router(analytics_router, prefix=settings.API_PREFIX)
    app.include_router(query_router, prefix=settings.API_PREFIX)
    app.include_router(clean_router, prefix=settings.API_PREFIX)
    app.include_router(export_router, prefix=settings.API_PREFIX)

    @app.get("/", tags=["System"])
    def root():
        return {
            "message": "Welcome to InsightAI API. Visit /docs for Swagger documentation.",
            "health_endpoint": f"{settings.API_PREFIX}/health",
        }

    return app


app = create_app()
