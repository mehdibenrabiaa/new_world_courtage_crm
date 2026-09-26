// A single choke point for client-side error/warn logging — still just
// console.* under the hood (no Sentry DSN configured for this project yet),
// but every call site now goes through one place, timestamped and
// consistently shaped, so wiring up a real error-tracking service later is
// a one-file change instead of hunting down every console.error in the app.
type LogContext = Record<string, unknown>

function format(level: string, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString()
  return context ? [`${timestamp} [${level}] ${message}`, context] as const : [`${timestamp} [${level}] ${message}`] as const
}

export const logger = {
  error(message: string, error?: unknown, context?: LogContext) {
    console.error(...format("error", message, context), error ?? "")
  },
  warn(message: string, context?: LogContext) {
    console.warn(...format("warn", message, context))
  },
  info(message: string, context?: LogContext) {
    console.info(...format("info", message, context))
  },
}
