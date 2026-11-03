// scripts/start-dev.js - Concurrently start backend server and Vite client
const { spawn } = require("child_process");
const path = require("path");

console.log("=======================================================");
console.log("  Launching Plant Material Delivery Guidance System");
console.log("=======================================================");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

// 1. Start Server
const serverProcess = spawn("node", ["server/index.js"], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "pipe",
  shell: true
});

serverProcess.stdout.on("data", (data) => {
  process.stdout.write(`[Backend] ${data}`);
});

serverProcess.stderr.on("data", (data) => {
  process.stderr.write(`[Backend ERR] ${data}`);
});

// 2. Start Vite Client
const clientProcess = spawn(npmCmd, ["--prefix", "client", "run", "dev"], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "pipe",
  shell: true
});

clientProcess.stdout.on("data", (data) => {
  process.stdout.write(`[Client] ${data}`);
});

clientProcess.stderr.on("data", (data) => {
  process.stderr.write(`[Client ERR] ${data}`);
});

// Graceful cleanup
const cleanExit = () => {
  console.log("\nShutting down backend and frontend dev servers...");
  try { serverProcess.kill(); } catch (e) {}
  try { clientProcess.kill(); } catch (e) {}
  process.exit(0);
};

process.on("SIGINT", cleanExit);
process.on("SIGTERM", cleanExit);
