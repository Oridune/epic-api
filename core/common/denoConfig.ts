import { join } from "path";

export interface DenoConfig {
  id: string;
  template: string;
  title: string;
  description: string;
  homepage?: string;
  compilerOptions?: {
    target?: string;
    module?: string;
    [key: string]: unknown; // To allow additional properties
  };
  importMap?: string;
  tasks?: Record<string, string>;
  [key: string]: unknown; // To allow additional properties
}

export const denoConfig: DenoConfig = (
  await import(`file:///${join(Deno.cwd(), "deno.json")}`, {
    with: { type: "json" },
  })
).default;
