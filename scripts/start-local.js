const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const NODE_MODULES_DIR = path.join(ROOT_DIR, 'node_modules');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const ENV_EXAMPLE_PATH = path.join(ROOT_DIR, '.env.example');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server.js');
const APP_URL = 'http://localhost:3000';
const HEALTH_URL = `${APP_URL}/api/health`;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const runCommandSync = (cmd, args, errorMessage) => {
  const result = spawnSync(cmd, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    console.error(errorMessage);
    process.exit(result.status || 1);
  }
};

const ensureDependencies = () => {
  if (!fs.existsSync(NODE_MODULES_DIR)) {
    console.log('[setup] Installing dependencies...');
    runCommandSync(npmCmd, ['install'], '[setup] npm install failed.');
  }
};

const ensureEnvFile = () => {
  if (fs.existsSync(ENV_PATH) || !fs.existsSync(ENV_EXAMPLE_PATH)) {
    return;
  }

  fs.copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
  console.log('[setup] Created .env from .env.example. Update SMTP values before using contact email.');
};

const checkHealth = () =>
  new Promise((resolve) => {
    const request = http.get(HEALTH_URL, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });

const waitForServer = async (timeoutMs = 30000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await checkHealth();
    if (ok) {
      return true;
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  return false;
};

const openBrowser = (url) => {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
};

const tryOpenBrowser = (url) => {
  try {
    openBrowser(url);
  } catch (_error) {
    console.log('[run] Browser auto-open failed. Open this URL manually:', url);
  }
};

const start = async () => {
  ensureDependencies();
  ensureEnvFile();

  console.log('[run] Starting portfolio server...');
  const serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: false,
  });

  const shutdown = () => {
    if (!serverProcess.killed) {
      serverProcess.kill('SIGINT');
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const isReady = await waitForServer();
  if (isReady) {
    console.log(`[run] Server is ready at ${APP_URL}`);
    tryOpenBrowser(APP_URL);
  } else {
    console.log('[run] Server did not pass health check in 30 seconds. Check logs above.');
  }

  serverProcess.on('exit', (code) => {
    process.exit(code === null ? 0 : code);
  });
};

start().catch((error) => {
  console.error('[run] Failed to start local environment:', error.message);
  process.exit(1);
});
