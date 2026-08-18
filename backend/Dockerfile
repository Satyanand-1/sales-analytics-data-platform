FROM node:20-bookworm-slim

# Install Python 3, python3-venv, pip, curl, and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    curl \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create work directory
WORKDIR /app

# Install Node dependencies first for caching
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Create virtual environment inside /app/.venv
# This matches unixVenv = rootDir/.venv/bin/python in pipeline.service.js
WORKDIR /app
RUN python3 -m venv .venv
RUN .venv/bin/pip install --upgrade pip
COPY etl/requirements.txt ./etl/
RUN .venv/bin/pip install -r ./etl/requirements.txt

# Copy source folders (except those ignored by .dockerignore)
COPY backend/ ./backend/
COPY etl/ ./etl/

# Set working directory to backend for executing npm start
WORKDIR /app/backend

# Expose backend port
EXPOSE 5001

CMD ["npm", "start"]
