# Treely – Family Tree App

A family tree application with **Vite + React + Tailwind** on the frontend and **.NET 10** on the backend. Users can register, log in, create a tree, and view/edit person profiles (biography and photo album). The tree is rendered with [family-chart](https://github.com/donatso/family-chart); clicking a person opens their profile page.

## Roles

- **Creator**: Can create a tree and add people.
- **Contributor**: Can add/edit people on an existing tree.
- **Visitor**: Can only view a tree.

## Run locally (no Docker)

### PostgreSQL

The backend uses **PostgreSQL**. Run it locally (e.g. Docker):

```bash
docker run -d --name treely-pg -e POSTGRES_USER=treely -e POSTGRES_PASSWORD=treely -e POSTGRES_DB=treely -p 5432:5432 postgres:16-alpine
```

Or install PostgreSQL and create a database/user matching `backend/appsettings.json` (Host=localhost, Port=5432, Database=treely, Username=treely, Password=treely).

### Backend

```bash
cd backend
dotnet run
```

API: `http://localhost:5271` (see `backend/Properties/launchSettings.json`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Set `VITE_API_URL=http://localhost:5271` if the API is on another host/port.

### First run

1. Register a user.
2. Create a tree (you become the **Creator**).
3. Use the API (e.g. Postman) to add persons to the tree until the UI supports “Add person”:
   - `POST /api/trees/{treeId}/persons` with body: `{ "firstName", "lastName", "gender": "M"|"F", "birthday?", "deathDate?", "avatarUrl?", "parentIds?", "spouseIds?", "childIds?" }`.
4. Open the tree and click a person to open their profile (biography and photo album).

## Run with Docker

From the repo root:

```bash
docker compose up --build
```

- Frontend: `http://localhost`
- Backend: `http://localhost:5000` (or via frontend nginx proxy at `/api`)
- PostgreSQL data is stored in the `treely-data` volume.

## Project layout

- `frontend/` – Vite + React + Tailwind + family-chart
- `backend/` – .NET 10 Web API, PostgreSQL, JWT auth
- `docker-compose.yml` – runs both services

## Tech stack

- **Frontend**: Vite, React 19, TypeScript, Tailwind CSS, React Router, [family-chart](https://github.com/donatso/family-chart)
- **Backend**: ASP.NET Core 10, EF Core, PostgreSQL (Npgsql), JWT
