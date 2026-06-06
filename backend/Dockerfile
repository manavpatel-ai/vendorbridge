# ---- Backend Dockerfile ----
# Multi-stage build for FastAPI + Uvicorn

# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /tmp

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Production image
FROM python:3.12-slim

# Metadata
LABEL maintainer="VendorBridge Team"
LABEL description="VendorBridge Backend API - FastAPI + Uvicorn"

# Set environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Create uploads directory for invoice PDFs
RUN mkdir -p /app/uploads/invoices

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
