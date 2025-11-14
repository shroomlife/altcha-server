import { Elysia, t } from "elysia";
import { createChallenge, verifySolution } from "altcha-lib";
import chalk from "chalk";

// ============================================================================
// Configuration & Validation
// ============================================================================

const SECRET = process.env.ALTCHA_HMAC_KEY;
const PORT = parseInt(process.env.PORT || "8080", 10);
const MAX_NUMBER = parseInt(process.env.ALTCHA_MAX_NUMBER || "100000", 10);
const SALT_LENGTH = parseInt(process.env.ALTCHA_SALT_LENGTH || "12", 10);
const EXPIRES_IN_MINUTES = parseInt(process.env.ALTCHA_EXPIRES_MINUTES || "5", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// Validate required environment variables
if (!SECRET || SECRET === "dev-secret") {
  console.error("❌ ERROR: ALTCHA_HMAC_KEY environment variable is required!");
  console.error("   Please set a secure secret key.");
  process.exit(1);
}

if (SECRET.length < 32) {
  console.warn("⚠️  WARNING: ALTCHA_HMAC_KEY should be at least 32 characters long for security.");
}

// ============================================================================
// Type Definitions
// ============================================================================

const ChallengeResponseSchema = t.Object({
  challenge: t.String(),
  salt: t.String(),
  algorithm: t.String(),
  signature: t.String(),
  expires: t.Optional(t.String()),
});

const VerifyRequestSchema = t.Object({
  payload: t.String({
    minLength: 1,
    description: "Base64-encoded ALTCHA payload",
  }),
});

const VerifyResponseSchema = t.Object({
  verified: t.Boolean(),
  error: t.Optional(t.String()),
});

const HealthResponseSchema = t.Object({
  status: t.String(),
  timestamp: t.String(),
  version: t.String(),
});

// ============================================================================
// Elysia App
// ============================================================================

const app = new Elysia()
  // CORS Configuration
  .onBeforeHandle(({ set, request }) => {
    set.headers["Access-Control-Allow-Origin"] = CORS_ORIGIN;
    set.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    set.headers["Access-Control-Allow-Headers"] = "Content-Type";
    
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }
  })

  // Security Headers
  .onAfterHandle(({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["X-XSS-Protection"] = "1; mode=block";
    set.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  })

  // Health Check Endpoint
  .get(
    "/health",
    () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.3.0",
    }),
    {
      response: HealthResponseSchema,
      detail: {
        tags: ["Health"],
        summary: "Health check endpoint",
      },
    }
  )

  // Create Challenge Endpoint
  .post(
    "/api/challenge",
    async ({ set }) => {
      try {
        const challenge = await createChallenge({
          hmacKey: SECRET,
          maxNumber: MAX_NUMBER,
          saltLength: SALT_LENGTH,
          algorithm: "SHA-256",
          expires: new Date(Date.now() + EXPIRES_IN_MINUTES * 60 * 1000),
        });

        set.status = 200;
        return challenge;
      } catch (error) {
        console.error("❌ Challenge creation failed:", error);
        set.status = 500;
        return {
          error: "Failed to create challenge",
        };
      }
    },
    {
      response: {
        200: ChallengeResponseSchema,
        500: t.Object({ error: t.String() }),
      },
      detail: {
        tags: ["ALTCHA"],
        summary: "Create a new ALTCHA challenge",
        description: "Generates a new proof-of-work challenge for client verification",
      },
    }
  )

  // Verify Solution Endpoint
  .post(
    "/api/verify",
    async ({ body, set }) => {
      try {
        // Validate payload format
        if (!body.payload || typeof body.payload !== "string") {
          set.status = 400;
          return {
            verified: false,
            error: "Invalid payload format",
          };
        }

        // Verify the solution
        const isValid = await verifySolution(body.payload, SECRET);

        if (!isValid) {
          set.status = 400;
          return {
            verified: false,
            error: "Invalid solution or expired challenge",
          };
        }

        set.status = 200;
        return {
          verified: true,
        };
      } catch (error) {
        console.error("❌ Verification failed:", error);
        set.status = 500;
        return {
          verified: false,
          error: "Verification process failed",
        };
      }
    },
    {
      body: VerifyRequestSchema,
      response: {
        200: VerifyResponseSchema,
        400: VerifyResponseSchema,
        500: VerifyResponseSchema,
      },
      detail: {
        tags: ["ALTCHA"],
        summary: "Verify an ALTCHA solution",
        description: "Validates the proof-of-work solution submitted by the client",
      },
    }
  )

  // 404 Handler
  .onError(({ code, set }) => {
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Route not found" };
    }
  })

  // Start Server
  .listen(PORT);

// ============================================================================
// Startup Log
// ============================================================================

console.log(`
${chalk.bold.cyan("ALTCHA Server - Production Ready")}

${chalk.green("✔")} Status: Running
${chalk.blue("•")} Port: ${PORT}
${chalk.blue("•")} URL: http://localhost:${PORT}

${chalk.bold("Endpoints")}
  GET  /health
  POST /api/challenge
  POST /api/verify

${chalk.bold("Configuration")}
  Max Number:    ${MAX_NUMBER}
  Salt Length:   ${SALT_LENGTH}
  Expires:       ${EXPIRES_IN_MINUTES} minutes
  CORS Origin:   ${CORS_ORIGIN}
`);

export type App = typeof app;
