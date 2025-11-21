# SecuraScan – MVP

A minimal web security scan MVP with:

- **Backend**: Rust + Actix-web + SQLx + PostgreSQL
- **Frontend**: React + Vite + TypeScript + Tailwind
- **DB**: Postgres (Docker)

This MVP supports:

- Creating real scan jobs via HTTP API
- Queue + worker system that runs scans in the background
- Storing scan status and results in PostgreSQL
- Frontend pages for Live Scan, History, and Results

---

## 1. Prerequisites

- **Docker** installed and running
- **Rust** toolchain (cargo)
- **Node.js + npm**
- **Git**

Clone the repo:

```bash
git clone https://github.com/erfanalizadeh8063-bit/secureScan_project.git
cd secureScan_project
