import type { BrowserOptions } from "@sentry/nextjs";

export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryOptions: BrowserOptions = {
  dsn: sentryDsn,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpBodies: [],
    urlQueryParams: false,
  },
  enhanceFetchErrorMessages: "report-only",
  beforeBreadcrumb: (breadcrumb) =>
    breadcrumb.category === "console" ? null : breadcrumb,
};
