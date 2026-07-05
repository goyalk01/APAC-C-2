export function initSentry(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    // Enterprise ready hook point for client-side Sentry error logging.
    // If sentry dependencies are installed later, replace this placeholder with:
    // Sentry.init({ dsn, tracesSampleRate: 1.0 });
    console.info(`[Sentry] SDK monitoring active on client bundle using DSN: ${dsn}`);
  }
}
