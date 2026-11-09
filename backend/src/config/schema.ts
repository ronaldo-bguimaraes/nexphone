import { z } from "zod";

const displaySchema = z
  .object({
    width: z.number().int().min(320).max(1920).multipleOf(2).default(720),
    height: z.number().int().min(320).max(1920).multipleOf(2).default(1280),
    fps: z.number().int().min(1).max(60).default(30),
  })
  .strict();

const runtimeSchema = z
  .object({
    adapter: z.string().min(1),
    image: z
      .string()
      .regex(
        /^[a-z0-9./_-]+@sha256:[a-f0-9]{64}$/,
        "runtime.image must be a pinned image digest (name@sha256:...)",
      ),
    display: displaySchema,
    gpuMode: z.enum(["guest", "host", "auto"]).default("guest"),
    memoryLimitMb: z.number().int().min(1024).max(65536).optional(),
    adapterConfig: z.record(z.unknown()).default({}),
  })
  .strict();

const tlsSchema = z
  .object({
    mode: z.enum(["caddy-internal", "provided"]).default("caddy-internal"),
    certPath: z.string().min(1).optional(),
    keyPath: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.mode === "provided" && (!value.certPath || !value.keyPath)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "host.tls.certPath and host.tls.keyPath are required when mode is provided",
      });
    }
  });

export const configSchema = z
  .object({
    host: z
      .object({
        binding: z.enum(["lan", "loopback"]).default("lan"),
        port: z.number().int().min(1).max(65535).default(8443),
        tls: tlsSchema,
      })
      .strict(),
    runtime: runtimeSchema,
    storage: z
      .object({
        dataPath: z.string().min(1),
        statePath: z.string().min(1),
      })
      .strict(),
    auth: z
      .object({
        pairingTtlSeconds: z.number().int().min(60).max(900).default(300),
        sessionIdleTtlSeconds: z.number().int().min(300).max(86400).default(43200),
        sessionAbsoluteTtlSeconds: z.number().int().min(3600).max(172800).default(86400),
        maxPairingAttemptsPerMinute: z.number().int().min(1).max(30).default(5),
      })
      .strict(),
    logging: z
      .object({
        level: z.enum(["debug", "info", "warn", "error"]).default("info"),
        retentionDays: z.number().int().min(1).max(90).default(14),
      })
      .strict(),
  })
  .strict();

export type NexPhoneConfig = z.infer<typeof configSchema>;
export type RuntimeConfig = NexPhoneConfig["runtime"];
export type AuthConfig = NexPhoneConfig["auth"];
