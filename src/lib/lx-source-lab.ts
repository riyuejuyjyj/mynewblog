import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { Script, createContext } from "node:vm";

const MAX_SOURCE_BYTES = 512 * 1024;
const SCRIPT_TIMEOUT_MS = 1500;
const ASYNC_SETTLE_MS = 40;
const MAX_RECORDED_REQUESTS = 20;

export type LxSourceProvider = "kg" | "tx" | "wy" | "kw" | "mg";
export type LxSourceQuality = "128k" | "320k" | "flac";

export type LxRedactedValue =
  | {
      kind: "url";
      origin: "<redacted>";
      protocol: string;
      queryKeys: string[];
      urlLength: number;
    }
  | { kind: "text"; length: number }
  | { kind: "array"; length: number }
  | { kind: "object"; keys: string[] }
  | { kind: "error"; message: string }
  | { kind: "null" | "undefined" | "boolean" | "number" | "bigint" | "symbol" | "function" };

export type LxSourceLabResult = {
  dryRun: true;
  sourceFileName: string;
  handlers: number;
  outboundRequests: Array<{
    method: string;
    timeout?: number;
    url: LxRedactedValue;
  }>;
  probe: {
    provider: string;
    quality: string;
    result: LxRedactedValue;
  } | null;
  sources: Record<
    string,
    {
      actions: string[];
      name?: string;
      qualitys: string[];
      type?: string;
    }
  >;
  warnings: string[];
};

export type LxSourceResolveResult = {
  audioUrl: string;
  provider: LxSourceProvider;
  quality: LxSourceQuality;
  sourceFileName: string;
  warnings: string[];
};

type LxRequestCallback = (
  error: Error | null,
  response: { body: null; statusCode: number },
) => void;

type LxHandler = (payload: unknown) => unknown | Promise<unknown>;
type LxSourceCodeInput = {
  sourceCode?: string;
  sourceName?: string;
  sourcePath?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown source lab error.";
}

function toOptionalString(value: unknown, maxLength = 160) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function toStringArray(value: unknown, maxItems = 16) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, 80))
    .slice(0, maxItems);
}

function redactValue(value: unknown): LxRedactedValue {
  if (typeof value === "string") {
    try {
      const url = new URL(value);

      return {
        kind: "url",
        origin: "<redacted>",
        protocol: url.protocol,
        queryKeys: Array.from(new Set(url.searchParams.keys())).sort().slice(0, 16),
        urlLength: value.length,
      };
    } catch {
      return {
        kind: "text",
        length: value.length,
      };
    }
  }

  if (value === null) return { kind: "null" };
  if (Array.isArray(value)) return { kind: "array", length: value.length };
  if (isRecord(value)) {
    return {
      kind: "object",
      keys: Object.keys(value).sort().slice(0, 16),
    };
  }

  switch (typeof value) {
    case "undefined":
      return { kind: "undefined" };
    case "boolean":
      return { kind: "boolean" };
    case "number":
      return { kind: "number" };
    case "bigint":
      return { kind: "bigint" };
    case "symbol":
      return { kind: "symbol" };
    case "function":
      return { kind: "function" };
    default:
      return { kind: "undefined" };
  }
}

function sanitizeSources(value: unknown) {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 12)
      .map(([key, source]) => {
        const sourceRecord = isRecord(source) ? source : {};

        return [
          key.slice(0, 24),
          {
            actions: toStringArray(sourceRecord.actions),
            name: toOptionalString(sourceRecord.name),
            qualitys: toStringArray(sourceRecord.qualitys),
            type: toOptionalString(sourceRecord.type),
          },
        ];
      }),
  );
}

function createMusicUrlPayload(
  provider: string,
  quality: string,
  songId: string,
) {
  return {
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
      quality,
      type: quality,
    },
    quality,
    source: provider,
    type: quality,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Probe timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readSourceCode(sourcePath: string) {
  const trimmedPath = sourcePath.trim();

  if (!trimmedPath.toLowerCase().endsWith(".js")) {
    throw new Error("音源脚本只接受 .js 文件。");
  }

  const sourceStat = await stat(trimmedPath).catch(() => null);

  if (!sourceStat?.isFile()) {
    throw new Error("找不到这个音源脚本，请检查本地路径。");
  }

  if (sourceStat.size > MAX_SOURCE_BYTES) {
    throw new Error("音源脚本超过 512KB，已停止运行。");
  }

  return {
    code: await readFile(trimmedPath, "utf8"),
    sourcePath: trimmedPath,
  };
}

async function loadSourceCode(input: LxSourceCodeInput) {
  const sourceCode = input.sourceCode?.trim();

  if (sourceCode) {
    if (sourceCode.length > MAX_SOURCE_BYTES) {
      throw new Error("音源脚本超过 512KB，已停止运行。");
    }

    return {
      code: sourceCode,
      sourcePath: input.sourceName?.trim() || "database-source.js",
    };
  }

  if (!input.sourcePath) {
    throw new Error("缺少音源脚本路径或脚本文本。");
  }

  return readSourceCode(input.sourcePath);
}

function extractPlayableUrl(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!isRecord(value)) return "";

  const candidateKeys = [
    "url",
    "musicUrl",
    "audioUrl",
    "playUrl",
    "location",
    "data",
  ];

  for (const key of candidateKeys) {
    const candidate = value[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (isRecord(candidate)) {
      const nested: string = extractPlayableUrl(candidate);
      if (nested) return nested;
    }
  }

  return "";
}

function assertPlayableUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }

    if (url.href.includes("undefined")) {
      throw new Error("source returned an incomplete URL");
    }

    return value;
  } catch {
    throw new Error("音源没有返回可播放的 HTTP/HTTPS URL。");
  }
}

async function requestWithTimeout(
  url: string,
  options: Record<string, unknown>,
) {
  const timeout =
    typeof options.timeout === "number"
      ? Math.min(Math.max(options.timeout, 500), 15000)
      : 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const method =
      typeof options.method === "string" ? options.method.toUpperCase() : "GET";
    const headers = isRecord(options.headers)
      ? Object.fromEntries(
          Object.entries(options.headers).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : undefined;
    const body =
      typeof options.body === "string" || options.body instanceof FormData
        ? options.body
        : undefined;
    const response = await fetch(url, {
      body,
      headers,
      method,
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const bodyText = await response.text();
    const bodyValue =
      contentType.includes("application/json") && bodyText
        ? JSON.parse(bodyText)
        : bodyText;

    return {
      body: bodyValue,
      headers: Object.fromEntries(response.headers.entries()),
      statusCode: response.status,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runLxSourceDryRun(input: {
  provider?: LxSourceProvider;
  quality?: LxSourceQuality;
  songId: string;
  sourcePath: string;
}): Promise<LxSourceLabResult> {
  const warnings: string[] = [];
  const { code, sourcePath } = await readSourceCode(input.sourcePath);
  const registeredHandlers: Array<{ eventName: unknown; handler: LxHandler }> = [];
  const sentEvents: Array<{ eventName: unknown; payload: unknown }> = [];
  const outboundRequests: LxSourceLabResult["outboundRequests"] = [];

  const sandbox: Record<string, unknown> = {
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
    queueMicrotask,
    setTimeout,
  };

  sandbox.globalThis = sandbox;
  sandbox.lx = {
    EVENT_NAMES: {
      inited: "inited",
      request: "request",
      updateAlert: "updateAlert",
    },
    on(eventName: unknown, handler: unknown) {
      if (typeof handler !== "function") {
        warnings.push("lx.on 收到非函数 handler，已忽略。");
        return;
      }

      registeredHandlers.push({
        eventName,
        handler: handler as LxHandler,
      });
    },
    request(
      url: unknown,
      optionsOrCallback?: unknown,
      callbackMaybe?: unknown,
    ) {
      const options = isRecord(optionsOrCallback) ? optionsOrCallback : {};
      const callback =
        typeof optionsOrCallback === "function" ? optionsOrCallback : callbackMaybe;
      const method =
        typeof options.method === "string"
          ? options.method.toUpperCase().slice(0, 16)
          : "GET";
      const timeout =
        typeof options.timeout === "number" ? options.timeout : undefined;

      if (outboundRequests.length < MAX_RECORDED_REQUESTS) {
        outboundRequests.push({
          method,
          timeout,
          url: redactValue(url),
        });
      }

      queueMicrotask(() => {
        if (typeof callback === "function") {
          (callback as LxRequestCallback)(
            new Error("Network disabled by source lab dry-run."),
            {
              body: null,
              statusCode: 0,
            },
          );
        }
      });

      return Promise.resolve({ body: null, statusCode: 0 });
    },
    send(eventName: unknown, payload: unknown) {
      sentEvents.push({ eventName, payload });
    },
  };

  try {
    const context = createContext(sandbox);

    new Script(code, { filename: sourcePath }).runInContext(context, {
      timeout: SCRIPT_TIMEOUT_MS,
    });
  } catch (error) {
    throw new Error(`音源脚本初始化失败：${toErrorMessage(error)}`);
  }

  await wait(ASYNC_SETTLE_MS);

  const initPayload = sentEvents.find(
    (event) => isRecord(event.payload) && isRecord(event.payload.sources),
  )?.payload;
  const sources = sanitizeSources(
    isRecord(initPayload) ? initPayload.sources : undefined,
  );
  const sourceKeys = Object.keys(sources);
  const requestedProvider = input.provider ?? (sourceKeys[0] as LxSourceProvider | undefined);
  const selectedProvider = requestedProvider ?? "";
  const selectedQuality =
    input.quality ||
    (selectedProvider ? sources[selectedProvider]?.qualitys[0] : undefined) ||
    "128k";

  if (registeredHandlers.length === 0) {
    warnings.push("没有检测到 lx.on 注册的请求处理器。");
  }

  if (sourceKeys.length === 0) {
    warnings.push("没有检测到 lx.send 暴露的 sources 元数据。");
  }

  if (requestedProvider && sourceKeys.length > 0 && !sources[requestedProvider]) {
    warnings.push(`音源元数据里没有声明 ${requestedProvider}，仍尝试 dry-run。`);
  }

  let probe: LxSourceLabResult["probe"] = null;

  if (selectedProvider && registeredHandlers[0]) {
    try {
      const result = await withTimeout(
        Promise.resolve(
          registeredHandlers[0].handler(
            createMusicUrlPayload(
              selectedProvider,
              selectedQuality,
              input.songId.trim() || "dry-run-id",
            ),
          ),
        ),
        SCRIPT_TIMEOUT_MS,
      );

      probe = {
        provider: selectedProvider,
        quality: selectedQuality,
        result: redactValue(result),
      };
    } catch (error) {
      const message = toErrorMessage(error).slice(0, 180);

      warnings.push(`musicUrl 探测失败：${message}`);
      probe = {
        provider: selectedProvider,
        quality: selectedQuality,
        result: {
          kind: "error",
          message,
        },
      };
    }
  }

  return {
    dryRun: true,
    handlers: registeredHandlers.length,
    outboundRequests,
    probe,
    sourceFileName: basename(sourcePath),
    sources,
    warnings,
  };
}

export async function resolveLxSourceMusicUrl(input: {
  provider: LxSourceProvider;
  quality: LxSourceQuality;
  sourceCode?: string;
  sourceName?: string;
  songId: string;
  sourcePath?: string;
}): Promise<LxSourceResolveResult> {
  const warnings: string[] = [];
  const { code, sourcePath } = await loadSourceCode({
    sourceCode: input.sourceCode,
    sourceName: input.sourceName,
    sourcePath: input.sourcePath,
  });
  const registeredHandlers: Array<{ eventName: unknown; handler: LxHandler }> = [];
  const sentEvents: Array<{ eventName: unknown; payload: unknown }> = [];
  const sandbox: Record<string, unknown> = {
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
    queueMicrotask,
    setTimeout,
  };

  sandbox.globalThis = sandbox;
  sandbox.lx = {
    EVENT_NAMES: {
      inited: "inited",
      request: "request",
      updateAlert: "updateAlert",
    },
    on(eventName: unknown, handler: unknown) {
      if (typeof handler === "function") {
        registeredHandlers.push({
          eventName,
          handler: handler as LxHandler,
        });
      }
    },
    request(
      url: unknown,
      optionsOrCallback?: unknown,
      callbackMaybe?: unknown,
    ) {
      const callback =
        typeof optionsOrCallback === "function" ? optionsOrCallback : callbackMaybe;
      const options = isRecord(optionsOrCallback) ? optionsOrCallback : {};
      const requestUrl = typeof url === "string" ? url : "";

      if (!requestUrl) {
        const error = new Error("lx.request missing URL.");
        if (typeof callback === "function") {
          queueMicrotask(() =>
            (callback as LxRequestCallback)(error, {
              body: null,
              statusCode: 0,
            }),
          );
        }

        return Promise.reject(error);
      }

      const requestPromise = requestWithTimeout(requestUrl, options);

      if (typeof callback === "function") {
        requestPromise.then(
          (response) => (callback as LxRequestCallback)(null, response),
          (error: unknown) =>
            (callback as LxRequestCallback)(new Error(toErrorMessage(error)), {
              body: null,
              statusCode: 0,
            }),
        );
      }

      return requestPromise;
    },
    send(eventName: unknown, payload: unknown) {
      sentEvents.push({ eventName, payload });
    },
  };

  try {
    const context = createContext(sandbox);

    new Script(code, { filename: sourcePath }).runInContext(context, {
      timeout: SCRIPT_TIMEOUT_MS,
    });
  } catch (error) {
    throw new Error(`音源脚本初始化失败：${toErrorMessage(error)}`);
  }

  await wait(ASYNC_SETTLE_MS);

  if (registeredHandlers.length === 0) {
    throw new Error("没有检测到音源请求处理器。");
  }

  const initPayload = sentEvents.find(
    (event) => isRecord(event.payload) && isRecord(event.payload.sources),
  )?.payload;
  const sources = sanitizeSources(
    isRecord(initPayload) ? initPayload.sources : undefined,
  );

  if (Object.keys(sources).length > 0 && !sources[input.provider]) {
    warnings.push(`音源元数据里没有声明 ${input.provider}，已继续尝试解析。`);
  }

  const result = await withTimeout(
    Promise.resolve(
      registeredHandlers[0].handler(
        createMusicUrlPayload(
          input.provider,
          input.quality,
          input.songId.trim() || "dry-run-id",
        ),
      ),
    ),
    15000,
  ).catch((error: unknown) => {
    throw new Error(`音源解析失败：${toErrorMessage(error)}`);
  });
  const playableUrl = assertPlayableUrl(extractPlayableUrl(result));

  return {
    audioUrl: playableUrl,
    provider: input.provider,
    quality: input.quality,
    sourceFileName: basename(sourcePath),
    warnings,
  };
}
