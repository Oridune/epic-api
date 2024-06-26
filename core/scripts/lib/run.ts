export const run = async (
  command: string | URL,
  options?: Deno.CommandOptions,
) => {
  const Command = new Deno.Command(command, options);

  const Process = Command.spawn();

  return await Process.status;
};
