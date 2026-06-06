const DISABLED_REASON =
  "LX source script execution is disabled in the Cloudflare production bundle.";

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

export async function runLxSourceDryRun(input: {
  provider: LxSourceProvider;
  quality: LxSourceQuality;
  songId: string;
  sourcePath: string;
}): Promise<LxSourceLabResult> {
  void input;

  throw new Error(DISABLED_REASON);
}

export async function resolveLxSourceMusicUrl(input: {
  provider: LxSourceProvider;
  quality: LxSourceQuality;
  songId: string;
  sourceCode?: string;
  sourceName?: string;
  sourcePath?: string;
}): Promise<LxSourceResolveResult> {
  void input;

  throw new Error(DISABLED_REASON);
}
