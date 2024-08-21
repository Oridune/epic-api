import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";

export const exec = promisify(_exec);

export const run = async (
  command: string | URL,
  options?: Deno.CommandOptions,
) => {
  const Command = new Deno.Command(command, options);

  const Process = Command.spawn();

  return await Process.status;
};
