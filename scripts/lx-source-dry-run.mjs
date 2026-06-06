import { readFile } from "node:fs/promises";
import { Script, createContext } from "node:vm";

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function redactUrl(value) {
  if (typeof value !== "string") {
    return { kind: typeof value };
  }

  try {
    const url = new URL(value);
    return {
      kind: "url",
      origin: "<redacted>",
      protocol: url.protocol,
      queryKeys: Array.from(url.searchParams.keys()).sort(),
      urlLength: value.length,
    };
  } catch {
    return {
      kind: "text",
      length: value.length,
    };
  }
}

const sourcePath = readArg("source");
const provider = readArg("provider");
const quality = readArg("quality");
const songId = readArg("id", "dry-run-id");

if (!sourcePath) {
  console.error(
    "Usage: bun scripts/lx-source-dry-run.mjs --source <lx-source.js> [--provider wy] [--quality 320k] [--id 123456]",
  );
  process.exit(1);
}

const code = await readFile(sourcePath, "utf8");
const registeredHandlers = [];
const sentEvents = [];
const outboundRequests = [];

const sandbox = {
  Promise,
  URL,
  clearTimeout,
  console: {
    debug() {},
    error() {},
    info() {},
    log() {},
    warn() {},
  },
  globalThis: {},
  queueMicrotask,
  setTimeout,
};

sandbox.globalThis = sandbox;
sandbox.lx = {
  EVENT_NAMES: {},
  on(eventName, handler) {
    registeredHandlers.push({ eventName, handler });
  },
  request(url, options, callback) {
    outboundRequests.push({
      method: options?.method ?? "GET",
      timeout: options?.timeout,
      url: redactUrl(url),
    });
    queueMicrotask(() => {
      callback(new Error("Network disabled by dry-run harness"), {
        body: null,
        statusCode: 0,
      });
    });
  },
  send(eventName, payload) {
    sentEvents.push({ eventName, payload });
  },
};

const context = createContext(sandbox);
new Script(code, { filename: sourcePath }).runInContext(context, {
  timeout: 1500,
});

await new Promise((resolve) => setTimeout(resolve, 30));

const initPayload = sentEvents.find((event) => event.payload?.sources)?.payload;
const sources = initPayload?.sources ?? {};
const sourceNames = Object.fromEntries(
  Object.entries(sources).map(([key, value]) => [
    key,
    {
      actions: value.actions ?? [],
      name: value.name,
      qualitys: value.qualitys ?? [],
      type: value.type,
    },
  ]),
);

let musicUrlProbe = null;
const selectedProvider = provider || Object.keys(sources)[0];
const selectedQuality =
  quality || sources[selectedProvider]?.qualitys?.[0] || "128k";

if (selectedProvider && registeredHandlers.length > 0) {
  const handler = registeredHandlers[0].handler;
  const result = await handler({
    action: "musicUrl",
    info: {
      musicInfo: {
        albumMid: songId,
        hash: songId,
        id: songId,
        mid: songId,
        rid: songId,
        songId,
        songmid: songId,
      },
      quality: selectedQuality,
    },
    source: selectedProvider,
  });

  musicUrlProbe = {
    provider: selectedProvider,
    quality: selectedQuality,
    result: redactUrl(result),
  };
}

console.log(
  JSON.stringify(
    {
      dryRun: true,
      handlers: registeredHandlers.length,
      outboundRequests,
      probe: musicUrlProbe,
      sources: sourceNames,
    },
    null,
    2,
  ),
);
