# Fulton's Quiz

Mobile-first puzzle quiz prototype based on the supplied tutorial and architecture reference.

## What is included

- Single-page quiz app with Word Scramble, Math Puzzle, Trivia, and Pattern Match views.
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

## Link to GitHub

Create a new GitHub repository, then run these commands from this folder:

```bash
git init
git add .
git commit -m "Initial Fulton's Quiz prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USER/fultons-quiz.git
git push -u origin main
```

For auto-deploy, add `SERVER_IP`, `SERVER_USER`, and `SSH_PRIVATE_KEY` in the repository secrets, clone the repo into `/srv/fultons-quiz` on the server, then trigger the `Deploy` workflow.
