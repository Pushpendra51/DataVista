from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router as api_router

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=settings.DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # Configure CORS for local development and integration with Vite React
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(api_router, prefix=settings.API_PREFIX)

    @app.get("/", tags=["System"])
    def root():
        return {
            "message": "Welcome to InsightAI API. Visit /docs for Swagger documentation.",
            "health_endpoint": f"{settings.API_PREFIX}/health"
        }

    return app

app = create_app()
