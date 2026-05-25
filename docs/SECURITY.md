# Security Notes

## Secret Handling

- Runtime secrets belong in `.env` files or deployment secret stores only.
- `GEMINI_API_KEY`, `JWT_SECRET`, and database passwords must never be committed.
- Rotate `POSTGRES_PASSWORD` before production launch and any time access may have been exposed. Update the deployment secret, restart dependent services, and verify that old credentials no longer authenticate.

## API Hardening

- Browser clients call the LottoLens backend for AI predictions; Gemini API keys stay server-side.
- Write endpoints require a JWT Bearer token.
- Security headers are set globally by the Fiber API.
