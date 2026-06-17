# Remote Deployment Guide - Party Ledger BI Module

This guide provides step-by-step instructions for deploying the Party Ledger web application and its Express backend server to remote cloud hosting platforms (such as Render, Railway, or VPS) connected to a PostgreSQL database.

---

## 1. Deployment Architecture

The application is designed as a **unified, single-process full-stack app**:
1. **Frontend**: Built using Vite + React. During deployment, the frontend is compiled into a folder of static files (`dist/`).
2. **Backend**: An Express server (`server.ts`). In production, this server handles `/api` endpoint requests AND serves the static frontend files from the `dist/` directory.
3. **Database**: A PostgreSQL database (remote or local).

This unified structure allows you to host the entire application on a **single web service instance** without needing separate frontend and backend hosting.

---

## 2. Environment Variables

Your remote hosting environment must configure the following variables:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string containing credentials and database name. | `postgresql://user:pass@host:5432/BI_ledger` |
| `PORT` | The port the backend server listens on. | `8080` (auto-detected on Render/Railway) |
| `GEMINI_API_KEY` | *(Optional)* Required if using Gemini AI functionalities. | `AIzaSy...` |

---

## 3. Provisioning the PostgreSQL Database

Before deploying the web service, you must create a PostgreSQL database on a cloud database host (e.g. Supabase, Render PostgreSQL, Neon, AWS RDS, or Aiven).

1. Create a new PostgreSQL database instance named `BI_ledger`.
2. Retrieve the **external connection string** (e.g., `postgresql://postgres:password@ep-cool-breeze-1234.us-east-2.aws.neon.tech/BI_ledger?sslmode=require`).
3. Save this connection string; you will input it as the `DATABASE_URL` environment variable during the web service setup.

---

## 4. Deployment Guides

### Option A: Hosting on Render (Recommended & Free)

Render is the simplest way to deploy the database and Express server.

#### Step 1: Push Your Code
Ensure your code changes are pushed to your remote Git repository (GitHub/GitLab).

#### Step 2: Create a Web Service on Render
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository.
4. Set the following configuration values:
   * **Name**: `party-ledger`
   * **Environment**: `Node`
   * **Region**: Choose the region closest to your database or users.
   * **Branch**: `main` (or your active branch)
   * **Build Command**: `npm install && npm run build && npm run build:server`
   * **Start Command**: `node server.js`
5. Click **Advanced** to add **Environment Variables**:
   * Add `DATABASE_URL` = *(Your PostgreSQL connection string)*
   * Add `GEMINI_API_KEY` = *(Your Gemini API Key, if applicable)*
6. Click **Deploy Web Service**.

Render will install the dependencies, build the React frontend into `dist`, bundle the TypeScript server into `server.js` using `esbuild`, start the server, and automatically initialize your PostgreSQL tables.

---

### Option B: Hosting on Railway

Railway is a developer-focused hosting platform with zero-configuration deployments.

#### Step 1: Create a Project
1. Log in to [Railway](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository.

#### Step 2: Configure variables and scripts
1. Click on the deployed service card and go to **Variables**.
2. Add:
   * `DATABASE_URL` = *(Your PostgreSQL connection string)*
   * `GEMINI_API_KEY` = *(Your Gemini API Key)*
3. Railway automatically detects `package.json`. If you need to specify commands manually:
   * **Build Command**: `npm install && npm run build && npm run build:server`
   * **Start Command**: `node server.js`

Railway will deploy the app and expose a public URL automatically.

---

### Option C: Hosting on a Virtual Private Server (VPS / Ubuntu)

For custom hosting (such as DigitalOcean, AWS EC2, or Linode).

#### Step 1: Server Setup
Connect to your server via SSH and install the required tools:
```bash
# Update package list and install Node.js (v18+) & Git
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

#### Step 2: Clone & Configure
```bash
# Clone the repository
git clone <YOUR_GIT_REPO_URL> party-ledger
cd party-ledger

# Install dependencies
npm install

# Create production build
npm run build
npm run build:server

# Set up environment variables
cp .env.example .env
nano .env
# Edit DATABASE_URL in the .env file to point to your PostgreSQL database
```

#### Step 3: Run with PM2 (Process Manager)
To ensure the backend server runs continuously in the background and restarts automatically if the server reboots:
```bash
# Install PM2 globally
sudo npm install -y pm2 -g

# Start the application
pm2 start server.js --name "party-ledger-bi"

# Save PM2 process list and configure autostart
pm2 save
pm2 startup
```

---

### Option D: Hosting on a Dedicated Server using aaPanel

For servers managed via aaPanel (popular for VPS and dedicated server hosting).

#### Step 1: Install Node.js Version Manager & Node.js
1. Log in to your **aaPanel dashboard**.
2. Go to the **App Store** on the left menu.
3. Search for **Node.js Version Manager** and install it.
4. Open the Node.js Version Manager and install **Node.js v18 or v20** (LTS release).
5. Set the installed Node version as the **Registry version** (command-line node path).

#### Step 2: Install PostgreSQL & Create Database
1. Go to the **App Store** in aaPanel.
2. Search for **PostgreSQL Manager** and install it.
3. Open PostgreSQL Manager, navigate to the **Databases** tab, and click **Add database**:
   * **Database name**: `bi_ledger`
   * **Username**: `postgres` (or a custom username)
   * **Password**: *(Set a secure password)*
4. Ensure the database connection details are accessible. If the database is on the same dedicated server, the host is `127.0.0.1` and port is `5432`.

#### Step 3: Clone Code & Build Projects
1. SSH into your dedicated server (or open the **Terminal** in aaPanel).
2. Clone the code into your web root directory and build it:
   ```bash
   cd /www/wwwroot
   git clone <YOUR_GIT_REPO_URL> party-ledger
   cd party-ledger
   
   # Install dependencies and build frontend and backend bundles
   npm install
   npm run build
   npm run build:server
   ```
3. Create and configure your environment variables in `.env`:
   ```bash
   cp .env.example .env
   nano .env
   # Set DATABASE_URL to: postgresql://<db_user>:<db_password>@127.0.0.1:5432/BI_ledger
   # Set PORT to 3001
   ```

#### Step 4: Configure the Node Project in aaPanel Website Manager
1. In aaPanel, navigate to the **Website** menu on the left and select the **Node Project** tab.
2. Click **Add Node Project** and fill out the details:
   * **Project path**: Select `/www/wwwroot/party-ledger`
   * **Project Name**: `party-ledger-bi`
   * **Run command**: Choose `node server.js` (or set the Startup file to `/www/wwwroot/party-ledger/server.js`)
   * **Project port**: `3001`
   * **Run User**: `www` (safe default server user)
3. Click **Submit**. aaPanel will launch the Node process and automatically supervise it (with auto-restart if it crashes).

#### Step 5: Map Domain Name (Nginx Reverse Proxy)
1. Find your project in the **Node Project** list in aaPanel.
2. Click **Mapping** in the action column.
3. Enter your target domain name (e.g. `ledger.yourdomain.com`). aaPanel will automatically create an Nginx config file proxying HTTP requests on port 80/443 to the Express backend port `3001`.
4. Go to the **Website** list, find your domain, click **SSL**, and request a free **Let's Encrypt SSL certificate** to enable HTTPS.

---

## 5. Verification after Deploying

Once your hosting server finishes building and goes live:
1. Open the public URL provided by your host (e.g. `https://party-ledger.onrender.com`).
2. Log in and verify that the dashboard widgets successfully load.
3. Access your database management tool (e.g. DBeaver, pgAdmin) and verify that the following tables have been automatically created and seeded:
   * `tenant_settings`
   * `parties`
   * `transactions`
   * `audit_logs`
4. Post a test transaction via the user interface and verify it is written to the remote database tables.
