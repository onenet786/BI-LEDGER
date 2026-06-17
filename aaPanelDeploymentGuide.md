# aaPanel Standalone Hosting & Deployment Guide

This guide provides a step-by-step walkthrough to host and deploy the **Party Ledger BI Engine** on a dedicated server or VPS managed with **aaPanel**.

---

## Architecture Overview

On your aaPanel server, the application runs as a unified Node.js process:
1. The **Express Backend** runs on port `3001`, handling REST API endpoints and database communication.
2. The **React Frontend** is compiled into static assets (`dist/`) and served directly by the Express server.
3. **PostgreSQL** handles storage on port `5432` locally.
4. **Nginx** acts as a reverse proxy, receiving public HTTP/HTTPS traffic on your domain and routing it to port `3001`.

```mermaid
graph TD
    User([User Web Browser]) -->|HTTPS: Port 443| Nginx[Nginx Reverse Proxy]
    Nginx -->|Proxy Pass: Port 3001| Express[Express Backend Server]
    Express -->|Serves Static Files| React[React Frontend Dist]
    Express -->|Connects: Port 5432| Postgres[(PostgreSQL Local DB)]
```

---

## Step 1: Install Required aaPanel Apps

Before deploying, make sure you install the necessary engines from the **aaPanel App Store**:

1. **Nginx**: Install **Nginx 1.22+** (recommended for reverse proxying and SSL).
2. **Node.js Version Manager**:
   - Search for "Node.js Version Manager" in the App Store and install it.
   - Open the manager, install **Node.js v18 or v20 (LTS)**.
   - Select the installed Node version and set it as the **Registry version** (this links node/npm commands globally).
3. **PostgreSQL Manager**:
   - Search for "PostgreSQL Manager" and install it.

---

## Step 2: Configure PostgreSQL Database

1. Open **PostgreSQL Manager** from the App Store or database menu.
2. Navigate to the **Databases** tab and click **Add database**:
   - **Database name**: `bi_ledger`
   - **Username**: `postgres` (or a custom username)
   - **Password**: `Admin786` (or your preferred secure password)
3. Under the **Service** tab, ensure PostgreSQL is started and running on port `5432`.
4. *Optional (If using external management tools like Adminer)*: If Adminer is running on the same server, connect to Host `127.0.0.1`, User `postgres`, Password `Admin786`, and Database `bi_ledger`.

---

## Step 3: Clone, Configure & Build the Application

1. Open the aaPanel **Terminal** or SSH into your server.
2. Navigate to the web root directory `/www/wwwroot/`:
   ```bash
   cd /www/wwwroot
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/onenet786/BI-LEDGER.git party-ledger
   cd party-ledger
   ```
4. Install npm dependencies:
   ```bash
   npm install
   ```
5. Create your environment variables file `.env` by copying the example:
   ```bash
   cp .env.example .env
   ```
6. Open `.env` (you can do this via the aaPanel File Manager or command line `nano .env`) and set the following parameters:
   ```env
   PORT=3001
   DATABASE_URL="postgresql://postgres:Admin786@127.0.0.1:5432/bi_ledger"
   ```
7. Build the production assets:
   ```bash
   # Compiles frontend React files into dist/ folder
   npm run build
   
   # Bundles the backend server.ts into server.js
   npm run build:server
   ```

---

## Step 4: Run Application in the Background (PM2 Manager)

aaPanel includes a **Node Project Manager** (PM2) to manage background processes and autostart them on server reboot.

1. Install **PM2 Manager** from the App Store if it isn't already installed.
2. Open **PM2 Manager** / **Node Project Manager** and click **Add Project**:
   - **Project Path**: Select `/www/wwwroot/party-ledger`
   - **Startup File**: Select `server.js` (the compiled backend server file)
   - **Project Port**: `3001`
   - **Project Name**: `party-ledger-bi`
   - **Run User**: `www` (recommended for security)
3. Click **Submit**. PM2 will launch the server and display its status as **Running**.
4. To ensure the server restarts automatically when the server reboots, click **Startup** or **Enable boot start** next to the project.

---

## Step 5: Map Your Domain & Configure Reverse Proxy

To make your application accessible to the public on a domain (e.g. `ledger.yourdomain.com`), map Nginx to proxy requests to your backend server:

1. In aaPanel, navigate to the **Website** menu on the left.
2. Click **Add site**:
   - **Domain**: Type your domain (e.g., `ledger.yourdomain.com`).
   - **Database**: Select *No Database* (as PostgreSQL is already running separately).
   - **Website Path**: Leave default or set to `/www/wwwroot/party-ledger`.
3. Click **Submit**.
4. Select the newly created website, go to its **Settings**, and select the **SSL** tab:
   - Apply for a free certificate using **Let's Encrypt**.
   - Check **Force HTTPS** to secure all traffic.
5. In the same website settings window, go to the **Reverse Proxy** tab and click **Add reverse proxy**:
   - **Proxy Name**: `ledger-proxy`
   - **Target URL**: `http://127.0.0.1:3001`
   - **Sent Domain**: `$host`
6. Click **Submit**.

---

## Step 6: Verify Deployment

1. Open your web browser and navigate to `https://ledger.yourdomain.com`.
2. The **Party Ledger Intelligence Engine** interface should load.
3. Switch to the **Super Admin** role and go to the **Workspace Settings** tab.
4. Verify the **Database Server Diagnostics** card at the top. It should display:
   - **Database Host**: `127.0.0.1`
   - **Database Name**: `bi_ledger`
   - **Status**: **Connected (PostgreSQL)** in green, indicating the system is actively synced with your local aaPanel PostgreSQL database.

---

## Troubleshooting

### Issue: Nginx shows 502 Bad Gateway
- **Cause**: The Express backend is not running on port `3001`.
- **Solution**: Open PM2 Manager in aaPanel, select the project, and check the logs. Restart the project if it has crashed.

### Issue: "Failed to initialize PostgreSQL database" in PM2 logs
- **Cause**: Incorrect database username, password, or host in the `.env` file.
- **Solution**: Open `/www/wwwroot/party-ledger/.env`, verify that `DATABASE_URL` matches your PostgreSQL credentials, and restart the PM2 project.
