declare module "custom-env" {
  export function env(
    stage?: string | boolean,
    dir?: string | null,
    encoding?: string | null,
    defaultEnvFallback?: boolean,
  ): void;
}
