/**
 * Locked, clean Next.js production build for Windows reliability.
 * Prevents concurrent builds from deleting .next mid-build (ENOENT flakes).
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectDir = path.join(__dirname, "..");
const lockPath = path.join(projectDir, ".build.lock");
const nextDir = path.join(projectDir, ".next");
const maxAttempts = 3;
const staleLockMinutes = 2;
const waitForActiveBuild =
  process.argv.includes("--wait") || process.env.BUILD_WAIT === "1";
const maxWaitMinutes = 8;

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function sleepMs(ms) {
  spawnSync("ping", ["127.0.0.1", "-n", String(Math.max(2, Math.ceil(ms / 1000) + 1))], {
    shell: true,
    stdio: "ignore",
  });
}

function rmDir(target) {
  if (!fs.existsSync(target)) return true;
  for (let i = 0; i < 5; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      if (!fs.existsSync(target)) return true;
    } catch {
      /* retry */
    }
    sleepMs(500);
  }
  if (process.platform === "win32") {
    spawnSync("cmd.exe", ["/c", "rmdir", "/s", "/q", target], {
      cwd: projectDir,
      stdio: "ignore",
    });
  }
  return !fs.existsSync(target);
}

function lockAgeMinutes() {
  if (!fs.existsSync(lockPath)) return null;
  return (Date.now() - fs.statSync(lockPath).mtimeMs) / (60 * 1000);
}

function removeStaleLock(age) {
  try {
    fs.unlinkSync(lockPath);
    log(`Removed stale .build.lock (${age.toFixed(1)} min old).`);
    return true;
  } catch (err) {
    log(`Could not remove stale .build.lock: ${err.message}`);
    return false;
  }
}

function acquireLock() {
  const started = Date.now();

  while (fs.existsSync(lockPath)) {
    const age = lockAgeMinutes() ?? 0;

    if (age >= staleLockMinutes) {
      if (!removeStaleLock(age)) return false;
      break;
    }

    if (!waitForActiveBuild) {
      log(
        `Another build appears to be running (lock ${age.toFixed(1)} min old). ` +
          "Wait for it to finish or delete .build.lock if no build is active."
      );
      return false;
    }

    const waitedMin = (Date.now() - started) / (60 * 1000);
    if (waitedMin >= maxWaitMinutes) {
      log(
        `Timed out after ${maxWaitMinutes} min waiting for .build.lock to clear.`
      );
      return false;
    }

    log(`Waiting for active build to finish (lock ${age.toFixed(1)} min old)…`);
    sleepMs(4000);
  }

  fs.writeFileSync(lockPath, String(process.pid), "utf8");
  return true;
}

function releaseLock() {
  try {
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch {
    /* ignore */
  }
}

function runNextBuild() {
  return spawnSync("npm run build:next", {
    cwd: projectDir,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    shell: true,
    env: { ...process.env },
  });
}

if (!acquireLock()) {
  process.exit(1);
}

let exitCode = 1;

try {
  log("Building Acer GST Reference Portal…");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt === 1 || !fs.existsSync(path.join(nextDir, "BUILD_ID"))) {
      log(`Cleaning .next (attempt ${attempt}/${maxAttempts})…`);
      rmDir(nextDir);
    }

    log(`Running next build (attempt ${attempt}/${maxAttempts})…`);
    const result = runNextBuild();
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) log(`spawn error: ${result.error.message}`);

    exitCode = result.status ?? 1;
    if (exitCode === 0) {
      log("Build completed successfully.");
      break;
    }

    if (attempt < maxAttempts) {
      log("Build failed — retrying with a clean output folder…");
      rmDir(nextDir);
      sleepMs(1500);
    } else {
      log(`Build failed with exit code ${exitCode} after ${maxAttempts} attempt(s).`);
    }
  }
} finally {
  releaseLock();
}

process.exit(exitCode);