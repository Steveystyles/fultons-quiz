# Fulton's Quiz

Mobile-first puzzle quiz prototype based on the supplied tutorial and architecture reference.

## What is included

- Single-page quiz app with Word Grid, Math Puzzle, Trivia, and Pattern Match views.
- Name/password sign-in for server-side Word Grid progress.
- SQLite-backed Word Grid answer history, found count, and guess totals.
- Local scoreboard stored in `localStorage`.
- Dependency-free Node static server with `/api/health`.
- Docker Compose setup with an app container behind Nginx.
- GitHub Actions deploy template for an Ubuntu server.

## Run locally

```bash
node server.js
```

Open `http://127.0.0.1:3000`.

## Run with Docker

```bash
docker compose up -d --build
```

Open `http://127.0.0.1:8080`.

The Docker setup stores the quiz database in the `quiz-data` volume at `/app/data`.

## GitHub repository

This prototype is linked to:

```text
https://github.com/Steveystyles/fultons-quiz
```

If you install Git locally later, you can connect this folder to the remote with:

```bash
git init
git add .
git commit -m "Initial Fulton's Quiz prototype"
git branch -M main
git remote add origin https://github.com/Steveystyles/fultons-quiz.git
git push -u origin main
```

For auto-deploy, add `SERVER_IP`, `SERVER_USER`, and `SSH_PRIVATE_KEY` in the repository secrets, clone the repo into `/srv/fultons-quiz` on the server, then trigger the `Deploy` workflow.
