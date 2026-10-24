# Sia Frontend

## Architecture

The frontend is a feature-oriented operating surface for clinic and meeting workflows. Business policy is centralized in the backend; React components consume prepared feature groups, capabilities, and operational state. The interface concentrates on configuration, live interaction, and reviewing outcomes.

```text
┌──────────────────────────────────────────────────────────────┐
│ BACKEND WORKSPACE PROJECTION                                 │
│ Feature groups · resource scope · capabilities               │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ SHARED WORKSPACE STATE                                       │
│ Current selection · request generation · feature reset       │
└──────────────────────────────────────────────────────────────┘
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ CLINIC           │  │ MEETINGS         │  │ CONVERSATION     │
│ Setup / register │  │ Inbox / meetings │  │ Agents / context │
│ Test ground      │  │ Live test ground │  │ Test ground      │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## 1. Workspace state and isolation

- **Server-prepared state:** the workspace overview supplies feature lists, membership details, and action capabilities. Screens do not reconstruct organization filtering or role policy.
- **Switch consistency:** changing workspaces clears the current view. Generation checks discard stale responses, while workspace-keyed content remounts to reset feature-local state.
- **Presentation boundary:** selected tabs, name search, and loading indicators stay local. Remembering a workspace identifier never grants access to it.
- **Shared failure handling:** request handling normalizes authentication expiry, validation errors, connectivity failures, and timeouts across features.

## 2. Clinic configuration, conversation, and follow-through

```text
┌──────────────────────────────────────────────────────────────┐
│ CLINIC CONFIGURATION                                         │
│ Template + context → backend validation                      │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ LIVE RECEPTIONIST                                            │
│ WebRTC → STT → guided flow + LLM → TTS                       │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ BOOKING COMPONENT                                            │
│ Availability → caller confirmation → persisted appointment   │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ DAILY REGISTER                                               │
│ Server-prepared entries + counts + visit capabilities        │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ VISIT COMPLETION                                             │
│ Validated staff update → authoritative register refresh      │
└──────────────────────────────────────────────────────────────┘
```

- **Configuration feeds execution:** clinic context is validated by the backend and supplies the facts, doctors, and scheduling rules used during calls.
- **Real workflow:** the test ground uses the operational clinic pipeline. Confirmed actions can create or change saved appointments.
- **Conversation visibility:** transcription and speech events provide a view of the live interaction; the backend owns intent, availability, confirmation, and persistence.
- **Visit completion:** the register is organized by appointment day. Counts, clinic-local dates, and per-entry visit eligibility come from the backend.
- **Authoritative refresh:** a visit update is followed by a fresh register read. The client does not independently derive booking rules or adjust aggregate counts.

## 3. Browser voice lifecycle

```text
┌──────────────────────────────────────────────────────────────┐
│ BROWSER SESSION                                              │
│ Microphone stream + peer connection + attempt identity       │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ BACKEND DOMAIN PIPELINE                                      │
│ Clinic flow or general conversation → Sarvam speech          │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ BROWSER OUTPUT                                               │
│ Audio playback + clinic transcription / speech events        │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ TEARDOWN                                                     │
│ Stop / disconnect / obsolete attempt → release resources     │
└──────────────────────────────────────────────────────────────┘
```

- A connection attempt owns its microphone stream, peer connection, timeout, and cancellation state.
- Obsolete attempts are discarded; ending a call releases tracks and connection resources.
- Clinic and general conversation share transport controls while the backend selects domain behavior.
- General agents use template and company context. Clinic agents add the guided flow and booking business components.
- Speech playback and connection feedback remain browser responsibilities; business outcomes remain backend responsibilities.

## 4. Calendar privacy and assignment

```text
┌──────────────────────────────────────────────────────────────┐
│ BACKEND ASSIGNMENT POLICY                                    │
│ Verified organizer → current memberships                     │
└──────────────────────────────────────────────────────────────┘
                                │
                   ┌────────────┴────────────┐
                   ▼                         ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ ONE ELIGIBLE WORKSPACE       │    │ MULTIPLE WORKSPACES          │
│ Automatic assignment         │    │ Personal inbox + choices     │
└──────────────────────────────┘    └──────────────────────────────┘
                   │                         │
                   └────────────┬────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ WORKSPACE MEETING                                            │
│ Occurrence or series assignment → workspace visibility       │
└──────────────────────────────────────────────────────────────┘
```

- **Private before assignment:** the inbox receives only the organizer's pending events and current organization choices. Colleagues and workspace owners do not receive that personal list.
- **Shared after assignment:** the resulting meeting is visible under its destination workspace's access rules.
- **Recurring intent:** an assignment can apply to an occurrence or establish a series preference, with agenda and auto-join configuration.
- **Identity boundary:** an operator-verified calendar identity determines eligibility. The UI surfaces missing linkage rather than inferring ownership from a signup email.

## 5. Meeting control and audio boundaries

```text
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ DASHBOARD CONTROL            │    │ GOOGLE MEET MEDIA            │
│ Join / leave / auto-join     │    │ Participant audio            │
└──────────────────────────────┘    └──────────────────────────────┘
                │                                   │
                ▼                                   ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ BACKEND ORCHESTRATION        │    │ ATTENDEE BRIDGE              │
│ Authorization + lifecycle    │    │ Audio input / playback       │
└──────────────────────────────┘    └──────────────────────────────┘
                │                                   │
                │                                   ↕
                │                 ┌──────────────────────────────┐
                │                 │ MEETING PIPELINE             │
                │                 │ STT → context → LLM → TTS    │
                │                 └──────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│ DASHBOARD FEEDBACK                                           │
│ Provider status · processing state · workspace memory        │
└──────────────────────────────────────────────────────────────┘
```

- **Control path:** dashboard actions request participation changes; backend capabilities determine whether manual controls are available.
- **Audio path:** participant audio bypasses the dashboard. Attendee exchanges audio directly with the backend meeting pipeline.
- **Operational feedback:** status refreshes expose provider and processing state so a requested join is distinguishable from actual participation.
- **Real-meeting testing:** the meeting test ground operates on assigned Google Meets and can join a live meeting.
- **Workspace memory:** the regular meetings view displays dated backend-maintained context covering fourteen UTC calendar days. Summarization, retries, and retention remain backend work; the test-ground view omits memory to keep participation controls focused.

## 6. Supporting business components

| Component | Architectural role |
| --- | --- |
| Template library | Exposes the platform-managed catalog used to configure agents. |
| Team management | Presents membership and invitation capabilities supplied by the backend; invitation delivery remains a separate user action. |
| Integration credentials | Supports authorized creation and revocation, with raw credentials revealed at creation. |
| Website integration | Keeps the long-lived credential on the customer server; the browser receives a limited, bot-bound voice grant. |
| Shared theme | Semantic color variables cover both light and dark modes; preference initialization happens before the main interface renders. |
| Shared UI primitives | Keep asynchronous actions, dialogs, errors, and feedback consistent across features. |

## Design decisions

- **Feature ownership shapes navigation:** Clinic Bot, Meetings Bot, and Other Bots each keep their operational screens and test ground together. Supporting administration sits under workspace settings.
- **One source of business policy:** permissions, classification, assignment choices, patient counts, and action eligibility are delivered by the backend.
- **Explicit lifecycle ownership:** components own browser resources and cancel obsolete work, preventing a workspace switch or late response from reviving an outdated interaction.
- **Separate meeting control from media:** the dashboard operates the assistant while Attendee and the backend carry the conversation.
- **Surface committed outcomes:** refresh persisted state after mutations and distinguish provider status from a command merely being submitted.

## Code organization

```text
src/
├── constants/constants.ts   Defaults, catalogs, storage keys and polling intervals
├── lib/types.ts             Shared data and component-state contracts
├── lib/api.ts               Feature request functions
├── utils/                   Request handling, context serialization and formatting
├── components/              Feature screens and shared interface components
└── app/                     Routes, layouts and theme styles
```

The frontend environment contains the backend origin and optional deployment-specific ICE servers. Fixed behavior is configured in the constants file. Shared pure helpers live under `utils`; components retain browser resource lifecycles and rendering.

## Clinic phone calls

Open **Clinic Bot → Phone calls** to select a clinic assistant, view incoming and
outgoing calls, and start an outbound call. The existing browser test ground stays
available from this screen. Owners/admins can dial and review uncertain call outcomes;
members can view history. Platform operators with workspace management access can
assign the Exotel number, enable/disable its route, and copy its private connection URL.
The backend `/phone/capabilities` endpoint supplies these permissions and service readiness.

Outbound requests retain their identifier in session storage until acknowledged,
so retrying after a lost response or page reload reuses the same attempt. Phone
numbers require a country code. Call history polls while the page is visible and
shows provider status; a completed call does not itself prove an appointment was booked.


## Sales Outreach

Open **Sales Outreach → Agents & campaigns** (`/outreach`) to create sales
agents, prepare campaigns from manual contacts or CSV, and view call results.
Owners and admins can save agents, create drafts, start or stop campaigns, and
resolve calls awaiting review. Members can view agents, campaigns, and calls.

Campaign creation only saves a draft. Starting a campaign explicitly confirms
real phone calls through the backend's Exotel integration. Sequential mode calls
one contact at a time; parallel mode calls up to five. Campaigns and call results
refresh every five seconds. Existing campaigns retain their original agent brief.
The backend's Outreach migrations and Exotel configuration must be ready before
starting calls. The frontend uses the existing `NEXT_PUBLIC_API_URL` and session.
