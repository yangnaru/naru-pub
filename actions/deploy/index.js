const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const FILE_EXTENSION_MIMETYPE_MAP = {
  html: "text/html",
  htm: "text/html",
  xml: "application/xml",
  xhtml: "application/xhtml+xml",
  svg: "image/svg+xml",
  md: "text/markdown",
  markdown: "text/markdown",
  mdx: "text/markdown",
  css: "text/css",
  txt: "text/plain",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  opus: "audio/opus",
  mid: "audio/midi",
  midi: "audio/midi",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
};

const ALLOWED_FILE_EXTENSIONS = new Set(
  Object.keys(FILE_EXTENSION_MIMETYPE_MAP),
);

function getInput(name, options = {}) {
  const key = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  const value = process.env[key]?.trim() ?? "";
  if (options.required && !value) {
    throw new Error(`Missing required input: ${name}`);
  }
  return value || options.defaultValue || "";
}

function getBooleanInput(name, defaultValue) {
  const value = getInput(name, { defaultValue: String(defaultValue) });
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function info(message) {
  console.log(message);
}

function setOutput(name, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  return fs.appendFile(output, `${name}=${value}\n`);
}

function setFailed(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`::error::${message}`);
  process.exitCode = 1;
}

function normalizeEndpoint(endpoint) {
  const url = new URL(endpoint);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function apiUrl(endpoint, pathname) {
  const url = new URL(endpoint.toString());
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${pathname}`;
  return url.toString();
}

function normalizeRelativePath(filePath) {
  const normalized = filePath.split(path.sep).join("/");
  if (!normalized || normalized.startsWith("/") || normalized.includes("//")) {
    throw new Error(`Invalid deploy path: ${filePath}`);
  }
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.split("/").some((part) => part === "." || part === "..")
  ) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  const extension = normalized.split(".").pop()?.toLowerCase();
  if (!extension || !ALLOWED_FILE_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported file extension: ${normalized}`);
  }

  return normalized;
}

async function collectFiles(rootDir, currentDir = rootDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(rootDir, absolutePath)));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    const relativePath = normalizeRelativePath(
      path.relative(rootDir, absolutePath),
    );
    const contents = await fs.readFile(absolutePath);
    const extension = relativePath.split(".").pop().toLowerCase();

    files.push({
      absolutePath,
      path: relativePath,
      sha256: crypto.createHash("sha256").update(contents).digest("hex"),
      size: contents.byteLength,
      contentType: FILE_EXTENSION_MIMETYPE_MAP[extension],
    });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

async function getOidcToken(audience) {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) {
    throw new Error(
      "GitHub OIDC is unavailable. Set workflow permissions: id-token: write.",
    );
  }

  const url = new URL(requestUrl);
  url.searchParams.set("audience", audience);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${requestToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to request GitHub OIDC token: ${response.status}`);
  }

  const body = await response.json();
  if (!body.value) {
    throw new Error("GitHub OIDC token response did not include a token");
  }
  return body.value;
}

async function postJson(url, token, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message: text
        ? `${response.status} ${response.statusText}: ${text.slice(0, 300)}`
        : `${response.status} ${response.statusText}`,
    };
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed: ${response.status} ${url}`,
    );
  }

  return data;
}

async function uploadFile(upload, file) {
  const contents = await fs.readFile(file.absolutePath);
  const response = await fetch(upload.url, {
    method: upload.method || "PUT",
    headers: upload.headers || {},
    body: contents,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to upload ${file.path}: ${response.status} ${response.statusText}`,
    );
  }
}

async function uploadFiles(uploads, fileByPath, concurrency = 4) {
  let index = 0;

  async function worker() {
    while (index < uploads.length) {
      const upload = uploads[index++];
      const file = fileByPath.get(upload.path);
      if (!file) {
        throw new Error(`Plan requested an unknown file: ${upload.path}`);
      }
      await uploadFile(upload, file);
    }
  }

  const workerCount = Math.min(concurrency, uploads.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

async function main() {
  const site = getInput("site", { required: true });
  const dir = getInput("dir", { required: true });
  const targetPrefix = getInput("target", { defaultValue: "/" });
  const endpoint = normalizeEndpoint(
    getInput("endpoint", { defaultValue: "https://naru.pub" }),
  );
  const audience = getInput("audience", { defaultValue: endpoint.origin });
  const shouldFinalize = getBooleanInput("finalize", true);
  const rootDir = path.resolve(process.cwd(), dir);

  const files = await collectFiles(rootDir);
  if (!files.some((file) => file.path === "index.html")) {
    throw new Error("Deploy directory must include index.html");
  }

  info(`Planning Naru deploy for ${site} with ${files.length} file(s)`);

  const token = await getOidcToken(audience);
  const plan = await postJson(
    apiUrl(endpoint, "/api/deploy/github/plan"),
    token,
    {
      site,
      targetPrefix,
      manifest: {
        files: files.map(({ absolutePath, ...file }) => file),
      },
    },
  );

  await setOutput("deployment-id", plan.deploymentId);
  info(`Uploading ${plan.uploads.length} staged file(s)`);

  const fileByPath = new Map(files.map((file) => [file.path, file]));
  await uploadFiles(plan.uploads, fileByPath);

  if (!shouldFinalize) {
    info(`Uploaded staged files for deployment ${plan.deploymentId}`);
    return;
  }

  info(`Finalizing deployment ${plan.deploymentId}`);
  const finalizeToken = await getOidcToken(audience);
  const finalize = await postJson(
    apiUrl(endpoint, "/api/deploy/github/finalize"),
    finalizeToken,
    {
      deploymentId: plan.deploymentId,
    },
  );

  await setOutput("deployed-files", finalize.deployedFiles ?? "");
  await setOutput("deleted-files", finalize.deletedFiles ?? "");
  await setOutput("directory-size", finalize.directorySize ?? "");
  info(
    `Deployed ${finalize.deployedFiles} file(s), deleted ${finalize.deletedFiles} file(s)`,
  );
}

main().catch(setFailed);
