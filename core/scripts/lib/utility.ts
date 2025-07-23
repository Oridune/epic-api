// deno-lint-ignore-file no-explicit-any
import { Readable } from "node:stream";
import { Buffer } from "node:buffer";

export const printStream = async (stream: ReadableStream<Uint8Array>) => {
  const Output: string[] = [];
  const Reader = stream.getReader();

  while (true) {
    const { value, done } = await Reader.read();

    if (done) break;

    Output.push(new TextDecoder().decode(value));

    Deno.stdout.write(value);
  }

  Reader.releaseLock();

  return Output;
};

export const nodeReadableToDenoReadableStream = (nodeReadable: Readable) => {
  return new ReadableStream({
    start(controller) {
      nodeReadable.on("data", (chunk) => {
        // Convert the chunk to Uint8Array if it's not already
        let uint8ArrayChunk;

        if (Buffer.isBuffer(chunk)) uint8ArrayChunk = new Uint8Array(chunk);
        else if (typeof chunk === "string") {
          uint8ArrayChunk = new TextEncoder().encode(chunk);
        } else throw new Error("Unsupported chunk type");

        // Enqueue the chunk into the Deno ReadableStream
        controller.enqueue(uint8ArrayChunk);
      });

      nodeReadable.on("end", () => {
        // Close the Deno ReadableStream when Node.js stream ends
        controller.close();
      });

      nodeReadable.on("error", (err) => {
        // Handle errors in Node.js stream by signaling the error in Deno stream
        controller.error(err);
      });
    },
  });
};

export const writeJSONFile = (path: string, data: any) =>
  Deno.writeTextFile(
    path,
    JSON.stringify(
      data,
      undefined,
      2,
    ),
  );
