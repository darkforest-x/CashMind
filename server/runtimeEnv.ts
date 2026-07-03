import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

type RuntimeSecretName = "SHORTCUT_TOKEN";

const RUNTIME_SECRET_NAMES: readonly RuntimeSecretName[] = [
  "SHORTCUT_TOKEN",
] as const;

const TOKEN_PREFIX: Record<RuntimeSecretName, string> = {
  SHORTCUT_TOKEN: "cm_shortcut",
};

function generateToken(name: RuntimeSecretName): string {
  return `${TOKEN_PREFIX[name]}_${randomBytes(32).toString("base64url")}`;
}

function hasEnvAssignment(content: string, name: RuntimeSecretName): boolean {
  const pattern = new RegExp(`^\\s*${name}\\s*=`, "m");
  return pattern.test(content);
}

function appendGeneratedSecrets(envPath: string, generatedSecrets: Readonly<Record<RuntimeSecretName, string | null>>): void {
  const existingContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const lines = RUNTIME_SECRET_NAMES.flatMap((name) => {
    const value = generatedSecrets[name];
    return value && !hasEnvAssignment(existingContent, name) ? [`${name}=${value}`] : [];
  });

  if (lines.length === 0) {
    return;
  }

  const separator = existingContent && !existingContent.endsWith("\n") ? "\n" : "";
  fs.appendFileSync(envPath, `${separator}${lines.join("\n")}\n`);
}

export function loadRuntimeEnv(): void {
  dotenv.config({ path: ".env.local", quiet: true });
  dotenv.config({ quiet: true });

  const generatedSecrets: Record<RuntimeSecretName, string | null> = {
    SHORTCUT_TOKEN: null,
  };

  for (const name of RUNTIME_SECRET_NAMES) {
    if (process.env[name]) {
      continue;
    }
    const token = generateToken(name);
    process.env[name] = token;
    generatedSecrets[name] = token;
  }

  appendGeneratedSecrets(path.join(process.cwd(), ".env"), generatedSecrets);
}
