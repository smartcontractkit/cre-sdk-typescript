# CRE Test Server

A small utility server for testing CRE HTTP capabilities. Provides endpoints for testing parallel workflow execution and cookie-based session authentication.

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

### Examples — Parallel workflow testing

Endpoints with varying response delays, useful for verifying that workflows fire requests concurrently rather than sequentially.

| Endpoint | Method | Delay | Response |
|---|---|---|---|
| `/api/v1/example1` | GET | 10s | `example1 completed` |
| `/api/v1/example2` | GET | 3s | `example2 completed` |
| `/api/v1/example3` | GET | 1s | `example3 completed` |

### Auth — Cookie-based session authentication

Simulates an API that requires authentication and maintains session state via multiple cookies. Login sets two cookies (`session_id` and `csrf_token`) — both must be present on every subsequent request.

This is designed to surface issues where workflows fail to forward cookies between requests.

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/login` | POST | Authenticate with `{"username":"testuser","password":"testpass"}`. Sets `session_id` and `csrf_token` cookies. |
| `/api/v1/auth/profile` | GET | Protected. Returns user profile. Requires both cookies. |
| `/api/v1/auth/data` | GET | Protected. Returns sample data. Requires both cookies. |
| `/api/v1/auth/logout` | POST | Clears session cookies. |

#### Example flow

```bash
# 1. Login and save cookies
curl -c cookies.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'

# 2. Access protected endpoint with cookies
curl -b cookies.txt http://localhost:3000/api/v1/auth/profile

# 3. Without cookies (returns 401 with missing_cookies list)
curl http://localhost:3000/api/v1/auth/profile
```
