import { spawn } from 'node:child_process';
import process from 'node:process';

const containerName = process.env.ZAP_DOCKER_NAME || 'zap-local';
const imageName = process.env.ZAP_DOCKER_IMAGE || 'zaproxy/zap-stable:latest';
const containerPort = process.env.ZAP_DOCKER_PORT || '8080';
const hostPort = process.env.ZAP_HOST_PORT || containerPort;
const zapHost = process.env.ZAP_API_URL || '127.0.0.1';
const appPort = process.env.PORT || '3001';
const publicUrl = process.env.PUBLIC_URL || `http://localhost:${appPort}`;
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';

let appProcess;
let shouldStopContainer = false;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const message = stderr.trim() || stdout.trim() || `${command} exited with code ${code}`;
      reject(new Error(message));
    });
  });
}

async function dockerContainerState() {
  try {
    const { stdout } = await run(dockerCommand, [
      'container',
      'inspect',
      '-f',
      '{{.State.Status}}',
      containerName,
    ]);

    return stdout.trim();
  } catch {
    return null;
  }
}

async function ensureZapContainer() {
  const state = await dockerContainerState();

  if (state === 'running') {
    console.log(`ZAP container '${containerName}' is already running on http://${zapHost}:${hostPort}`);
    return;
  }

  if (state) {
    console.log(`Starting existing ZAP container '${containerName}'...`);
    await run(dockerCommand, ['start', containerName], { stdio: 'inherit' });
    shouldStopContainer = true;
    return;
  }

  console.log(`Creating ZAP container '${containerName}' from ${imageName}...`);
  await run(
    dockerCommand,
    [
      'run',
      '--name',
      containerName,
      '-u',
      'zap',
      '-p',
      `${hostPort}:${containerPort}`,
      '-d',
      imageName,
      'zap.sh',
      '-daemon',
      '-host',
      '0.0.0.0',
      '-port',
      containerPort,
      '-config',
      'api.disablekey=true',
      '-config',
      'api.addrs.addr.name=.*',
      '-config',
      'api.addrs.addr.regex=true',
    ],
    { stdio: 'inherit' },
  );
  shouldStopContainer = true;
}

async function stopZapContainer() {
  if (!shouldStopContainer) {
    return;
  }

  try {
    const state = await dockerContainerState();
    if (state === 'running') {
      console.log(`Stopping ZAP container '${containerName}'...`);
      await run(dockerCommand, ['stop', containerName], { stdio: 'inherit' });
    }
  } catch (error) {
    console.error(`Failed to stop ZAP container '${containerName}':`, error instanceof Error ? error.message : error);
  }
}

function attachShutdownHandlers() {
  const shutdown = async (signal) => {
    if (appProcess && !appProcess.killed) {
      appProcess.kill(signal);
    }

    await stopZapContainer();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

async function main() {
  attachShutdownHandlers();

  try {
    await ensureZapContainer();
  } catch (error) {
    console.error('Unable to start the ZAP Docker container.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  console.log('Building the app and starting the existing production-style server...');
  console.log(`App:      ${publicUrl}`);
  console.log(`ZAP API:  http://${zapHost}:${hostPort}`);

  const buildCode = await new Promise((resolve, reject) => {
    const buildProcess = spawn(pnpmCommand, ['build'], {
      env: {
        ...process.env,
        PORT: appPort,
        PUBLIC_URL: publicUrl,
        ZAP_API_URL: zapHost,
      },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    buildProcess.on('close', (code) => resolve(code ?? 0));
    buildProcess.on('error', reject);
  });

  if (buildCode !== 0) {
    await stopZapContainer();
    process.exit(buildCode);
  }

  appProcess = spawn(pnpmCommand, ['start'], {
    env: {
      ...process.env,
      PORT: appPort,
      PUBLIC_URL: publicUrl,
      ZAP_API_URL: zapHost,
    },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  appProcess.on('close', async (code) => {
    await stopZapContainer();
    process.exit(code ?? 0);
  });

  appProcess.on('error', async (error) => {
    console.error('Failed to start pnpm start.');
    console.error(error instanceof Error ? error.message : error);
    await stopZapContainer();
    process.exit(1);
  });
}

await main();
