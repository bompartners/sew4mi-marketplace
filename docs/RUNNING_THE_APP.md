# Running the Sew4Mi Application

## Quick Start

### 1. Navigate to the Application Directory
```bash
cd /home/eboateng/projects/sew4mi-dev/sew4mi
```

**Important:** The application must be run from the `sew4mi/` subdirectory, not the root `sew4mi-dev/` directory.

### 2. Start the Development Server
```bash
pnpm dev
```

### 3. Access the Application
- **Local URL:** http://localhost:3000
- **Network URL:** http://10.255.255.254:3000 (for testing on other devices)

---

## Prerequisites

Before running the application, ensure you have:

- **Node.js:** 18.0.0 or higher
- **pnpm:** 8.0.0 or higher (specified: 8.15.9)
- **Dependencies installed:** Run `pnpm install` if `node_modules` is missing

---

## Expected Startup Behavior

### Turbo Build System
```
turbo 2.5.5
• Packages in scope: @sew4mi/config, @sew4mi/shared, @sew4mi/ui, web
• Running dev in 4 packages
```

### Next.js Server
```
▲ Next.js 15.4.6
- Local:        http://localhost:3000
- Environments: .env.local
✓ Ready in 8-10s
```

### Initial Compilation Times
- **Middleware:** ~3-4 seconds
- **Home page (/):** ~160 seconds (first compile only)
- **Auth pages (/login, /register):** ~5-150 seconds (first compile)
- **Subsequent compilations:** ~150-700ms (Fast Refresh)

---

## Verification Steps

### 1. Check Port Availability
```bash
# From project root
ss -tuln | grep 3000
# OR
netstat -tuln | grep 3000
```

**Expected output:**
```
tcp   LISTEN 0      511                 *:3000             *:*
```

### 2. Check Process Status
```bash
ps aux | grep -E "(pnpm|next)" | grep -v grep
```

### 3. Test in Browser
Open http://localhost:3000 and verify the application loads.

---

## Common Issues and Solutions

### Issue: "Command 'dev' not found"
**Cause:** Running from wrong directory (root instead of `sew4mi/`)

**Solution:**
```bash
cd sew4mi
pnpm dev
```

### Issue: Port 3000 Already in Use
**Solution:**
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
# OR
pkill -f "next dev"
```

### Issue: Missing Dependencies
**Solution:**
```bash
cd /home/eboateng/projects/sew4mi-dev/sew4mi
pnpm install
```

### Issue: Environment Variables Missing
**Solution:**
```bash
# Check if .env.local exists in apps/web/
cd apps/web
ls -la | grep .env.local

# If missing, copy from example
cp .env.example .env.local
# Then edit with actual values
```

---

## Development Workflow

### Starting Development
1. Navigate to project: `cd /home/eboateng/projects/sew4mi-dev/sew4mi`
2. Start server: `pnpm dev`
3. Wait for "Ready" message
4. Open browser to http://localhost:3000

### Stopping Development
- **Keyboard:** Press `Ctrl+C` in the terminal
- **Process Kill:** `pkill -f "turbo dev"`

### Running in Background
```bash
cd /home/eboateng/projects/sew4mi-dev/sew4mi
nohup pnpm dev > dev.log 2>&1 &
```

To stop background process:
```bash
pkill -f "turbo dev"
```

---

## Available Scripts

From `/home/eboateng/projects/sew4mi-dev/sew4mi/`:

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start development server (all packages) |
| `pnpm build` | Build all packages for production |
| `pnpm build:web` | Build only the web application |
| `pnpm test` | Run all tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm check-env` | Validate environment variables |
| `pnpm clean` | Clean build artifacts and dependencies |

---

## Monorepo Structure

The application uses **Turbo** for monorepo management:

```
sew4mi/
├── apps/
│   └── web/              # Main Next.js application (port 3000)
├── packages/
│   ├── @sew4mi/config    # Shared configuration
│   ├── @sew4mi/shared    # Shared types and utilities
│   └── @sew4mi/ui        # Shared UI components
```

When you run `pnpm dev`, Turbo orchestrates all packages and starts the web app on port 3000.

---

## Performance Notes

### First-Time Compilation
- **Middleware:** 3-4 seconds
- **Root route (/):** ~160 seconds
- **Auth routes:** 5-150 seconds

These long initial compile times are normal for Next.js 15 with a large codebase.

### Hot Reload (Fast Refresh)
- Subsequent changes compile in 150-700ms
- Full page reload may be triggered for certain changes

### Network Performance
The app is optimized for Ghana's mobile-first market:
- Progressive Web App (PWA) support
- Offline capabilities
- 2G/3G network optimization

---

## Environment Configuration

### Required Environment Variables
Located in: `sew4mi/apps/web/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
```

### Validate Configuration
```bash
pnpm check-env
```

---

## Quick Reference

**✅ Correct way to run:**
```bash
cd /home/eboateng/projects/sew4mi-dev/sew4mi && pnpm dev
```

**❌ Wrong way (will fail):**
```bash
cd /home/eboateng/projects/sew4mi-dev && pnpm dev
# Error: Command "dev" not found
```

---

## Additional Resources

- **Main README:** `/home/eboateng/projects/sew4mi-dev/README.md`
- **Architecture Docs:** `/home/eboateng/projects/sew4mi-dev/docs/architecture/`
- **API Documentation:** `/home/eboateng/projects/sew4mi-dev/docs/apis/README.md`
- **CLAUDE Guide:** `/home/eboateng/projects/sew4mi-dev/CLAUDE.md`

---

**Last Updated:** September 30, 2025

