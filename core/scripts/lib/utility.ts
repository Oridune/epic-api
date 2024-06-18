export const printStream = async (stream: ReadableStream<Uint8Array>) => {
  const Output: string[] = [];
  const Reader = stream.getReader();

  while (true) {
    const { value, done } = await Reader.read();

    if (done) break;

    const Decoded = new TextDecoder().decode(value);

    Output.push(Decoded);

    console.log(Decoded);
  }

  Reader.releaseLock();

  return Output;
};
