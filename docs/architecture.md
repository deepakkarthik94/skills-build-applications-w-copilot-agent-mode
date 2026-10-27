# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep route-level UI in React components and route all HTTP calls through the shared API client. Components own loading, empty, success, and accessible error states; business rules and persistence stay out of the presentation tier.
- Logic tier decision: Keep HTTP parsing/status codes in Express routes and put capability behavior in backend services. Validate request shape and ObjectId format before database lookups, check referenced records exist, and return deliberate 4xx responses instead of leaking Mongoose cast errors as 500s.
- Data tier decision: Use Mongoose models as the persistence boundary. Require the documented identity, relationship, and workout fields; default team members to an empty array; store activity references, minutes, points, and occurrence time. Keep seed data representative and idempotent without deleting unrelated records.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and positive `minutes`; validate both IDs and confirm the user and team exist. Store their references, calculate points as one point per minute, and set `occurredAt` on the server. Return the created activity and list persisted activities from the API.
- Team management approach: Reject a missing or blank name with `400`; persist and return the submitted name and mascot. Accept member IDs as references, default omitted members to an empty list, and expose members when listing teams.
- Leaderboard approach: Sum persisted activity points per team, include teams with no activity at zero points, sort descending by total, and assign ranks starting at 1. Do not duplicate or persist derived totals.
- Workout suggestions approach: Find the user by email and return a deliberate 4xx when no user matches. Rank available workouts so the first focus matches the user's fitness goal, falling back to recent activity when needed, and include a concise reason tied to that goal or activity.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`. A failure points to model validation, defaults/relationships, or seed idempotence/data preservation. Current result: all 5 data-contract tests pass.
- API command: `npm run test:api --prefix octofit-tracker/backend`. A failure points to route/service behavior or the API-to-model contract: request validation, creation/listing, leaderboard aggregation/ranking, or workout matching/reasons. Current baseline: all 4 API contract tests fail.
- Frontend command: `npm test --prefix octofit-tracker/frontend`. A failure points to API-client integration, route rendering, or accessible loading/empty/error states. Current baseline: all 15 presentation contract tests fail.
- Backend build command: `npm run build --prefix octofit-tracker/backend`. A failure indicates a TypeScript compile/type error in the backend. Current baseline: passes.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`. A failure indicates a TypeScript or Vite production-build error. Current baseline: passes.
- Exercise metadata command: `node --test tests/exercise-validation.test.mjs`. This checks the exercise scaffolding and grading/workflow contracts, not OctoFit runtime behavior. Current baseline: 4 failures trace to the README Copy Exercise badge owner/name mismatch; treat separately from tier tests.

Run the data-tier tests first, then API tests, then frontend tests; this follows the dependency direction and localizes contract breaks. Run both builds after implementation changes as compilation and production-bundle gates.
