# Voxa frontend

A Next.js App Router + TypeScript dashboard for the FastAPI voice-bot platform in
`../bots-backend`. Uses the real backend APIs; there is no demo-data mode.

## Start

Use Node.js 20.9 or newer (Node 24 recommended).

```sh
cd bots-frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The backend defaults to
`http://127.0.0.1:8000`. Start PostgreSQL, apply backend migrations, and start FastAPI
as described in `../bots-backend/README.md`. Create an account in the UI to get started.
The backend's Sarvam API key is required only for live voice, not dashboard management.

## Included

- Email/password registration and login; session-expiry and backend-unavailable handling.
- Workspace selection and creation, with organization-scoped content and role-aware controls.
- Live template catalog, agent creation, context/language editing, search, deletion, and ID copying.
- Voice playground: real microphone capture, WebRTC SDP negotiation, remote audio playback,
  mute/end controls, elapsed time, timeout and permission handling, and unmount cleanup.
- API-key creation, one-time secret display, listing, and revocation.
- Team members, invitation token creation/copying, and invitation acceptance.
- Agent-specific public integration snippets and links to the public API reference.
- Responsive desktop/mobile navigation and dialogs, keyboard focus, reduced-motion support.

The team API currently returns other members' IDs and roles, so the UI shows those
rather than inventing names or email addresses. Invitations are shared manually;
email delivery, password reset, call analytics/history, and billing are not backend features.

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Main FastAPI origin without `/api/v1`; defaults to `http://127.0.0.1:8000`. Used for requests and integration snippets. |
| `NEXT_PUBLIC_ICE_SERVERS` | JSON array of browser ICE/TURN servers matching the backend deployment. |

Public variables are compiled into the client build. Rebuild after changing the API
URL. Keep the meeting worker URL and all service credentials in the backend.

## Authentication and API requests

The browser calls FastAPI directly through the shared Axios client. Login and
registration return a JWT, saved in a frontend cookie (`voxa_access_token`). The client
reads the cookie and adds `Authorization: Bearer <token>` to authenticated requests.
Login and registration requests do not include a previous token. Logout deletes the
cookie; the backend has no logout/revocation endpoint. The cookie expires with the JWT,
uses `SameSite=Lax` and `Path=/`, and sets `Secure` when the frontend uses HTTPS.
A protected API 401 clears the current token and redirects to login. Dashboard content
is shown after the backend confirms the user.

There are no Next.js API routes. The token cookie is JavaScript-readable so Axios can
send the bearer header; it is not HTTP-only. The backend validates permissions for
every protected endpoint. Workspace selection remains a localStorage preference.

Set backend `CORS_ORIGINS` to the allowed frontend origins. Local defaults allow both
`http://localhost:3000` and `http://127.0.0.1:3000`; configure your actual frontend origin
for deployment and serve frontend/backend over HTTPS.

## Project layout

```text
src/app/
  login/                  Sign-in and registration
  (dashboard)/            Protected layout and dashboard pages
src/components/
  workspace.tsx           Current user, workspace, catalog, and agent state
  shell.tsx               Sidebar, navigation, organization switcher
  agents.tsx              Agent management and template library
  playground.tsx          WebRTC lifecycle and voice testing
  settings.tsx            Keys, team invitations, integration guide
  ui.tsx                  Dialogs, buttons, notices, visual components
src/lib/
  api-client.ts           Single exported Axios instance and error handling
  api.ts                  Named, typed API functions used by components
  types.ts                Shared response types
```

## API source of truth

`src/lib/api-client.ts` exports the shared Axios instance (`apiClient`). It owns
request defaults, timeout handling, readable API errors, and session-expiry events.
`src/lib/api.ts` exports a function for each API operation, such as `login`,
`listOrganizations`, `createBot`, `joinMeeting`, and `createVoiceSession`.
Components import these functions instead of constructing URLs or calling Axios.
Request and response types are shared in `src/lib/types.ts`.

All URLs come from `API_ORIGIN` in `api-client.ts`, configured by
`NEXT_PUBLIC_API_URL`. API functions supply only relative backend endpoint paths.
There is no frontend forwarding layer.

## Checks

```sh
npm run typecheck
npm run build
```

## Production

```sh
npm run build
npm start
```

The frontend makes requests directly to the public FastAPI origin. Configure backend
CORS for the frontend's deployment URL. The meeting worker remains a private service
used only by the backend.

Clinic-enabled agents use their saved company context for all clinic facts. The agent
editor accepts free-text background plus clinic details, doctors, timezone and calendar
fields; it stores them together in the backend's existing `company_context` string.
Booking needs explicit doctors and a complete schedule. No example clinic data is
used as a fallback. The voice playground shows only the selected agent's saved data.

### Meetings

`/meetings` lists the selected workspace's assigned meeting schedules and agendas.
`/calendar-inbox` is visible only to backend-configured platform operators, who can
review shared calendar events and assign them to a workspace. Configure
`MEETING_OPERATOR_USER_IDS` on the backend with existing dashboard user UUIDs and restart
it. Workspace ownership alone does not grant access to the global inbox.



Meeting voice uses Attendee through the main backend. Connect the voice agent from
an assigned meeting or enable auto-join, then address it with “Sia” or “Hey Sia” and
a question. The meetings page shows one shared rolling memory string for the workspace,
covering the last fourteen days. Recurring series can route future occurrences automatically. Configure the Attendee API key and
public HTTPS backend URL as described in
[meeting-attendee-voice.md](../bots-backend/docs/meeting-attendee-voice.md).
# voice-bots-frontend
