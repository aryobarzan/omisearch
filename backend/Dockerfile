FROM python:3.15-slim

WORKDIR /app

# `PYTHONDONTWRITEBYTECODE=1` - avoid unnecessary pycache writes in the docker container
# PYTHONUNBUFFERED=1 - disable output buffering to ensure logs appear immediately in docker compose logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
# copy requirements list and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# copy source code
COPY . .

EXPOSE 8000
# launch backend app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
