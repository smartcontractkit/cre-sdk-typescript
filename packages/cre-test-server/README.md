# CRE Test Server

A small utility server for testing the CRE HTTP capability. Exposes endpoints with configurable delays to simulate slow API responses.

## Running the server

```bash
# Start the server (default port 3000)
bun start

# Start with hot reload for development
bun dev

# Use a custom port
PORT=8080 bun start
```

## Endpoints

| Endpoint | Method | Delay | Response |
|----------|--------|-------|----------|
| `/api/v1/example1` | GET | 10s | `example1 completed` |
| `/api/v1/example2` | GET | 3s | `example2 completed` |
