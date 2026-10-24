import http from "http";

const CONTAINER_NAMES = {
  1: "moviebook-server-1",
  2: "moviebook-server-2",
  3: "moviebook-server-3",
  4: "moviebook-backup"
};

const SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

function dockerApi(method, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: SOCKET, path: urlPath, method, timeout: 30000 },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 304) {
            resolve({ status: res.statusCode, body });
          } else {
            reject(new Error(body || `Docker API ${res.statusCode}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Docker socket timed out")));
    req.end();
  });
}

export async function dockerControlAvailable() {
  try {
    await dockerApi("GET", "/version");
    return true;
  } catch {
    return false;
  }
}

function containerName(nodeId) {
  const name = CONTAINER_NAMES[Number(nodeId)];
  if (!name) throw new Error(`No container mapped for node ${nodeId}`);
  return name;
}

export async function containerIsRunning(nodeId) {
  const { body } = await dockerApi("GET", `/containers/${containerName(nodeId)}/json`);
  return Boolean(JSON.parse(body)?.State?.Running);
}

/** running=true starts the compose container. running=false stops it. */
export async function setContainerRunning(nodeId, running) {
  const name = containerName(nodeId);
  const action = running ? "start" : "stop";
  await dockerApi("POST", `/containers/${name}/${action}?t=3`);
  return { nodeId: Number(nodeId), container: name, running: Boolean(running) };
}
