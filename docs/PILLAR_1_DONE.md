# Pillar 1 Done: Security

## Files Changed

- `backend/cmd/api/main.go`: registered auth routes, protected write routes, added security headers, and added rate-limited `/api/v1/ai/predict`.
- `backend/internal/handlers/ai_handler.go`: added the AI prediction handler.
- `backend/internal/services/ai_service.go`: added backend-only Gemini prediction calls using `GEMINI_API_KEY` and model fallback.
- `backend/internal/handlers/auth_handler.go`: added register and login endpoints.
- `backend/internal/services/auth_service.go`: added bcrypt password hashing and JWT issue/validation.
- `backend/internal/middleware/auth.go`: added Bearer token validation middleware.
- `backend/internal/repositories/user_repository.go`: added user persistence through Prisma.
- `backend/prisma/schema.prisma`: added the `User` model.
- `backend/.env.example`: documented `GEMINI_API_KEY`, `JWT_SECRET`, and `JWT_EXPIRY_HOURS`.
- `frontend/src/services/api.js`: added auth token attachment and backend AI prediction client.
- `frontend/src/services/gemini.js`: replaced browser Gemini SDK usage with the backend AI proxy.
- `frontend/package.json`: removed the browser Gemini SDK dependency.
- `frontend/.env.example` and `frontend/.env`: removed `VITE_GEMINI_API_KEY`.
- `docker-compose.yml`: passed server-side AI/JWT environment variables into the API container.
- `.gitignore`: verified environment files are ignored and added `*.pem` / `*.key`.
- `docs/SECURITY.md`: added secret handling and `POSTGRES_PASSWORD` rotation guidance.

## Verification Notes

- `VITE_GEMINI_API_KEY` has been removed from frontend source and env templates.
- `/api/v1/ai/predict` is wrapped with the existing Fiber rate limiter.
- `POST /api/v2/lottery/result`, `DELETE /api/v2/lottery/result/:id`, and v1 draw write routes now require JWT auth.
