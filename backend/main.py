from fastapi import FastAPI

app = FastAPI(title="Omisearch API")

# Basic endpoints
@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
