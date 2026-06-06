FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV SERVICE_MODULE=gateway.main
CMD ["sh", "-c", "python -m ${SERVICE_MODULE}"]
