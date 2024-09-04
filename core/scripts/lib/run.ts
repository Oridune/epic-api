import {
  exec as _exec,
  spawn as _spawn,
  SpawnOptionsWithoutStdio,
} from "node:child_process";
import { promisify } from "node:util";
import { nodeReadableToDenoReadableStream, printStream } from "./utility.ts";

export const exec = promisify(_exec);

export const run = async (
  command: string | URL,
  options?: Deno.CommandOptions,
) => {
  const Command = new Deno.Command(command, options);

  const Process = Command.spawn();

  return await Process.status;
};

export const spawn = async (
  command: string,
  options?: SpawnOptionsWithoutStdio,
) => {
  const [executable, ...args] = command.split(" ");
  const Process = _spawn(executable, args, options);

  return await Promise.all([
    printStream(nodeReadableToDenoReadableStream(Process.stdout)),
    printStream(nodeReadableToDenoReadableStream(Process.stderr)),
  ]);
};
