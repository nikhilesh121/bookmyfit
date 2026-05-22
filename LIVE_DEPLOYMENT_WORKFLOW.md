# BookMyFit Live Deployment Workflow

This project must use GitHub as the source of truth for live deployments.

## Source Of Truth

- GitHub repo: `https://github.com/nikhilesh121/bookmyfit.git`
- Main branch: `main`
- Local workspace: `C:\Users\pattn\OneDrive\OneDrive\Desktop\Company Files\Bugcry\Projects\Bookmyfit`
- Live server repo path: `/var/www/html/bookmyfit`
- Live server SSH: `root@157.245.102.208`

## Required Flow

1. Make all code changes locally.
2. Run relevant local checks/builds before deployment.
3. Ask before committing or pushing.
4. Commit source code changes only.
5. Push local `main` to `nikhilesh121/bookmyfit`.
6. SSH into the live server.
7. Pull the latest `main` from `https://github.com/nikhilesh121/bookmyfit.git`.
8. Build the affected apps on the server.
9. Run database migrations when backend/entity/migration files changed.
10. Restart only the affected PM2 services.
11. Verify live health and URLs after restart.

## Live Git Setup

The live server repo at `/var/www/html/bookmyfit` should have:

```bash
origin  https://github.com/nikhilesh121/bookmyfit.git
main -> origin/main
```

If `git status -sb` shows tracking another repo, fix it before deployment.

## PM2 Services

Common BookMyFit services on live:

- `bmf-backend`
- `bmf-admin`
- `bmf-gym`
- `BMF` for landing
- `bmf-corp`
- `bmf-wellness`

Restart only what changed. For backend changes, usually restart `bmf-backend`. For admin/gym panel changes, rebuild that app and restart its PM2 service.

## Do Not Commit Generated Artifacts

Do not commit generated files unless explicitly requested:

- APK files such as `BookMyFit-live-api-release.apk`
- Mobile web export folders such as `apps/mobile/dist-web/`
- `.next`, `dist`, Android `build`, `.cxx`, or cache folders

## Safety Rule

Do not directly edit live server files for normal work. Live should be updated by pulling from GitHub. Direct live edits are only for emergency debugging and require approval first.
