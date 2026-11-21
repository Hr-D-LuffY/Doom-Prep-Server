# Dooms Prep

A full-stack application that helps MCU fans plan a rewatch before _Avengers: Doomsday_ and book an opening-night watch party.

- **Rewatch planner:** store movies and their prerequisites, then get the exact order to watch everything needed before a target movie, with progress and remaining time.
- **Watch-party booking:** cinemas sell seats in fixed bundles; the API returns the fewest bundles that add up to exactly the group size.

This repository contains the **backend API**. The React frontend is built after the backend is complete.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Project structure](#project-structure)
3. [Getting started](#getting-started)
4. [API reference](#api-reference)
5. [How the core algorithms work](#how-the-core-algorithms-work)
6. [Assumptions and design decisions](#assumptions-and-design-decisions)
7. [How I used AI tools](#how-i-used-ai-tools)

---

## Tech stack

| Area       | Choice                                                |
| ---------- | ----------------------------------------------------- |
| Runtime    | Node.js 20.19+                                        |
| Language   | TypeScript (strict mode)                              |
| Framework  | Express                                               |
| Database   | PostgreSQL                                            |
| ORM        | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Build      | tsup (bundler module resolution)                      |
| Validation | Hand-written (no validation library)                  |

The cycle detection, rewatch ordering and booking logic are written by hand. No graph, topological-sort or coin-change libraries are used.

---

## Project structure

```
.
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
├── prisma7.config.ts
├── src/
│   ├── generated/prisma/             # generated Prisma client (git-ignored)
│   ├── config/
│   │   └── env.ts                    # reads and checks environment variables
│   ├── errors/
│   │   └── AppError.ts               # error with status code and error code
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma client instance
│   │   └── validators.ts             # shared validation helpers
│   ├── middlewares/
│   │   ├── errorHandler.ts           # one place that formats every error
│   │   └── notFound.ts
│   ├── modules/
│   │   ├── movie/
│   │   │   ├── movie.interface.ts    # all TypeScript types for the module
│   │   │   ├── movie.validation.ts   # hand-written input checks
│   │   │   ├── movie.service.ts      # business rules and database access
│   │   │   ├── movie.controller.ts   # request in, response out
│   │   │   ├── movie.routes.ts
│   │   │   ├── cycleDetection.ts     # pure function: circular dependency check
│   │   │   └── rewatchOrder.ts       # pure function: ordered prerequisites
│   │   └── cinema/
│   │       ├── cinema.interface.ts
│   │       ├── cinema.validation.ts
│   │       ├── cinema.service.ts
│   │       ├── cinema.controller.ts
│   │       ├── cinema.routes.ts
│   │       └── bookingQuote.ts       # pure function: minimum bundles (DP)
│   ├── app.ts                        # Express app and route mounting
│   └── server.ts                     # server entry point
├── .env.example
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## Getting started

### Prerequisites

- Node.js 20.19 or newer
- PostgreSQL 14 or newer, running locally or hosted
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and edit it:

```bash
cp .env.example .env
```

| Variable       | Description                  | Example                                                        |
| -------------- | ---------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/doomsday_ready` |
| `PORT`         | Port the API listens on      | `3000`                                                         |

### 3. Set up the database

Create an empty database, then generate the Prisma client and apply migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Run the server

```bash
# development, with reload
npm run dev

# production
npm run build
npm start
```

The API is served at `http://localhost:3000/api`.

---

## API reference

All routes are under `/api`. Request and response bodies are JSON.

### Movies

| Method | Path                            | Purpose                                                 |
| ------ | ------------------------------- | ------------------------------------------------------- |
| POST   | `/api/movies`                   | Create one movie or an array of movies                  |
| GET    | `/api/movies`                   | List all movies                                         |
| GET    | `/api/movies/:id`               | Get one movie                                           |
| PATCH  | `/api/movies/:id`               | Update a movie, including `watched` and `prerequisites` |
| DELETE | `/api/movies/:id`               | Delete a movie and its prerequisite links               |
| GET    | `/api/movies/:id/rewatch-order` | Ordered list of movies to watch before the target       |

#### `POST /api/movies`

```json
{
  "title": "Iron Man",
  "releaseYear": 2008,
  "runtime": 126,
  "prerequisites": [],
  "watched": false
}
```

`prerequisites` and `watched` are optional (defaults: `[]` and `false`). Returns `201` with the movie, including its `id` and `prerequisites` as an array of ids. If the body is an array, the response is an array in the same order.

#### `PATCH /api/movies/:id`

Send only the fields to change. `prerequisites` replaces the whole list.

```json
{ "watched": true, "prerequisites": [1, 2] }
```

Returns `200` with the updated movie. Returns `409 CIRCULAR_DEPENDENCY` if the new prerequisites would create a cycle, and nothing is saved.

#### `DELETE /api/movies/:id`

```json
{ "message": "Movie deleted successfully", "id": 5 }
```

#### `GET /api/movies/:id/rewatch-order`

```json
{
  "target": { "id": 4, "title": "Captain America: Civil War" },
  "order": [
    { "id": 1, "title": "Iron Man", "runtime": 126, "watched": true },
    {
      "id": 2,
      "title": "Captain America: The First Avenger",
      "runtime": 124,
      "watched": false
    },
    { "id": 3, "title": "The Avengers", "runtime": 143, "watched": false }
  ],
  "totalCount": 3,
  "watchedCount": 1,
  "remainingMinutes": 267
}
```

The target itself is never included. `remainingMinutes` is the total runtime of the unwatched movies in `order`.

### Cinemas

| Method | Path                                   | Purpose                                  |
| ------ | -------------------------------------- | ---------------------------------------- |
| POST   | `/api/cinemas`                         | Create one cinema or an array of cinemas |
| GET    | `/api/cinemas`                         | List all cinemas                         |
| GET    | `/api/cinemas/:id`                     | Get one cinema                           |
| DELETE | `/api/cinemas/:id`                     | Delete a cinema                          |
| GET    | `/api/cinemas/:id/booking?groupSize=6` | Booking quote                            |

#### `POST /api/cinemas`

```json
{ "name": "Star Cineplex", "bundleSizes": [2, 5] }
```

Returns `201` with the cinema. Bundle sizes are stored in ascending order.

#### `GET /api/cinemas/:id/booking?groupSize=11`

```json
{
  "possible": true,
  "groupSize": 11,
  "totalBundles": 4,
  "breakdown": [
    { "size": 5, "count": 1 },
    { "size": 2, "count": 3 }
  ]
}
```

When no exact combination exists:

```json
{ "possible": false, "groupSize": 7 }
```

### Errors

Every error uses the same shape:

```json
{
  "error": {
    "code": "CIRCULAR_DEPENDENCY",
    "message": "These prerequisites would create a circular dependency"
  }
}
```

| Status | Code                                 | When                                                                                                                              |
| ------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`                   | Invalid input: runtime out of range, empty title, bad bundle sizes, unknown prerequisite id, `groupSize` outside 1–10,000, bad id |
| 400    | `INVALID_JSON`                       | Malformed JSON body                                                                                                               |
| 404    | `NOT_FOUND`                          | Movie, cinema or route does not exist                                                                                             |
| 409    | `CIRCULAR_DEPENDENCY`                | An update would form a cycle                                                                                                      |
| 409    | `DUPLICATE_TITLE` / `DUPLICATE_NAME` | Movie title or cinema name already exists                                                                                         |
| 500    | `INTERNAL_SERVER_ERROR`              | Unexpected failure                                                                                                                |

---

## How the core algorithms work

All three are pure functions in their own files, with no database or framework code.

### Circular dependency detection (`cycleDetection.ts`)

Before saving new prerequisites for movie _X_, check whether _X_ is reachable from any of the new prerequisites by following prerequisite links. This is a depth-first search with a visited set. If _X_ is reached, saving would close a loop, so the request is rejected with `409` and nothing is written. A movie listing itself is the simplest case of the same check. Complexity is O(V + E).

### Rewatch order (`rewatchOrder.ts`)

An iterative post-order depth-first search from the target. A movie is added to the result only after all of its own prerequisites have been added, which guarantees every movie comes after what it depends on. A visited set ensures each movie appears once. The target is excluded. An explicit stack is used instead of recursion so a very long prerequisite chain cannot overflow the call stack. Prerequisites are visited in ascending id order, so output is deterministic. Complexity is O(V + E).

### Booking quote (`bookingQuote.ts`)

Minimum coin change with dynamic programming. `minBundles[n]` is the fewest bundles that give exactly `n` seats, and `lastBundle[n]` records which bundle size was used last. After filling the table up to the group size, the breakdown is rebuilt by walking backwards through `lastBundle`. If the target is unreachable, the response is `possible: false`. A greedy approach is not used because it can fail: with sizes 6, 9 and 20 and a group of 44, greedy takes 20 + 20 and gets stuck, while DP finds 20 + 9 + 9 + 6. Complexity is O(groupSize × number of bundle sizes).

---

## Assumptions and design decisions

The brief leaves some points open. These are the choices made.

**Movies**

1. `POST /api/movies` accepts one object or an array. A batch is all-or-nothing, and the response mirrors the shape of the request (object in, object out; array in, array out).
2. `releaseYear` must be an integer from 1900 to 2100. Only the year is stored, not a full date. `runtime` must be an integer from 1 to 300.
3. Titles are trimmed and limited to 200 characters. Uniqueness is case-sensitive.
4. A prerequisite id that does not exist returns `400 VALIDATION_ERROR`. Inside a batch, prerequisites must be ids of movies that already exist, not movies from the same request.
5. A prerequisite list with duplicate ids is rejected with `400`.
6. `PATCH` is partial. `prerequisites` replaces the whole list. Empty bodies and unknown fields are rejected with `400`. The cycle check runs before any write, so a rejected update changes nothing.
7. Deleting a movie removes its own prerequisite links and also removes it from other movies' prerequisite lists. The other movies are kept.
8. The rewatch order is deterministic: prerequisites are visited in ascending id order. The target is excluded, and its own watched status and runtime are not counted. A movie with no prerequisites returns an empty `order`.

**Cinemas and booking**

9. `POST /api/cinemas` accepts one object or an array, all-or-nothing. Names are trimmed (maximum 100 characters) and unique, case-sensitive.
10. A cinema has 1 to 10 bundle sizes, each an integer from 1 to 500. Duplicate bundle sizes are rejected with `400` rather than silently removed. Sizes are stored in ascending order.
11. `groupSize` is a required query parameter and must be a whole number from 1 to 10,000.
12. When several combinations use the same minimum number of bundles, ties are resolved in favour of larger bundles, so results are deterministic. The breakdown is sorted by bundle size, largest first.

**General**

13. Delete endpoints return `200` with a confirmation message and the deleted id.
14. All errors share one format, produced by a single error handler. Malformed JSON returns `400 INVALID_JSON`.
15. Authentication, pagination and rate limiting are out of scope for this project.
16. Seed data uses publicly listed release years and runtimes. The prerequisite links are a viewing guide chosen for this project and are not official.

---

## How I used AI tools

AI tools were used in this project, as the brief allows. This section describes how.

**Tool:** Claude .

**How I Used AI**

- **Planning:** Discussed the API list, error format, module structure, and commit plan. Also planned the validation rules for movie and cinema inputs, including which fields to check, allowed ranges, and edge cases.
- **Code drafting:** For some sections, I wrote the initial logic or pseudocode myself and asked the AI to implement it. When the output was incorrect, I clarified the approach and asked it to revise. For simple, well-defined functions, I sometimes asked the AI to write them directly to save time.
- **Seed data:** Looked up MCU release years and runtimes, including the most recent releases. The prerequisite links were chosen as a sensible viewing guide.
- **Documentation:** Drafted this README.
