/**
 * Instrumentation Entry Point
 * Next.js official pattern for isolating Node.js runtime code from the Edge runtime.
 * Ref: node_modules/next/dist/docs/01-app/02-guides/instrumentation.md
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./src/instrumentation.node");
  }
}
