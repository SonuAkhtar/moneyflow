import * as Sentry from "@sentry/nextjs";

type Meta = Record<string, unknown>;

const emit = (
  level: "error" | "warn" | "info",
  context: string,
  detail?: unknown,
  meta?: Meta,
) => {
  if (typeof console === "undefined") return;
  const prefix = `[${context}]`;
  if (detail !== undefined && meta) console[level](prefix, detail, meta);
  else if (detail !== undefined) console[level](prefix, detail);
  else console[level](prefix);
};

export const logger = {
  error: (context: string, detail?: unknown, meta?: Meta) => {
    emit("error", context, detail, meta);
    Sentry.captureException(
      detail instanceof Error
        ? detail
        : new Error(`${context}: ${String(detail)}`),
      { tags: { context }, extra: meta },
    );
  },
  warn: (context: string, detail?: unknown, meta?: Meta) =>
    emit("warn", context, detail, meta),
  info: (context: string, detail?: unknown, meta?: Meta) =>
    emit("info", context, detail, meta),
};
