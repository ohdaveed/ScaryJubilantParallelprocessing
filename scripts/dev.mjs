import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const root = resolve(__dirname, "..");
const viteBin = resolve(root, "node_modules", "vite", "bin", "vite.js");
const viteArgs = process.argv.slice(2);

const children = [];
const activeChildren = new Set();
let shuttingDown = false;
let desiredExitCode = 0;

function startLabeledProcess(label, command, args) {
  const child = spawn(command, args, {
    stdio: ["inherit", "pipe", "pipe"],
    cwd: root,
    env: process.env
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });

  children.push(child);
  activeChildren.add(child);
  return child;
}

function shutdown(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (activeChildren.has(child) && !child.killed) {
      try {
        child.kill(signal);
      } catch {
        // Ignore errors when child already exited.
      }
    }
  }
}

const api = startLabeledProcess("0", process.execPath, ["--env-file=.env", "server.js"]);
const vite = startLabeledProcess("1", process.execPath, [viteBin, ...viteArgs]);

for (const child of [api, vite]) {
  child.on("exit", (code, signal) => {
    activeChildren.delete(child);

    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
      process.stderr.write(`[dev] child exited with ${reason}; stopping all processes\n`);
      desiredExitCode = typeof code === "number" ? code : 1;
      shutdown();
    }

    if (shuttingDown && activeChildren.size === 0) {
      process.exit(desiredExitCode);
    }
  });
}

process.on("SIGINT", () => {
  desiredExitCode = 0;
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  desiredExitCode = 0;
  shutdown("SIGTERM");
});

process.on("SIGBREAK", () => {
  desiredExitCode = 0;
  shutdown("SIGTERM");
});

process.on("SIGHUP", () => {
  desiredExitCode = 0;
  shutdown("SIGTERM");
});
