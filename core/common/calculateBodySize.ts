type BodySizeResult = {
  size: number | null;
};

export function calculateBodySize(body: unknown): BodySizeResult {
  // null / undefined
  if (body == null) {
    return { size: 0 };
  }

  // string
  if (typeof body === "string") {
    return {
      size: new TextEncoder().encode(body).byteLength,
    };
  }

  // Uint8Array (covers Buffer-like)
  if (body instanceof Uint8Array) {
    return {
      size: body.byteLength,
    };
  }

  // ArrayBuffer
  if (body instanceof ArrayBuffer) {
    return {
      size: body.byteLength,
    };
  }

  // Blob / File
  if (body instanceof Blob) {
    return {
      size: body.size,
    };
  }

  // ReadableStream (⚠️ cannot pre-calculate)
  if (body instanceof ReadableStream) {
    return {
      size: null, // unknown upfront
    };
  }

  // Object (JSON fallback)
  if (typeof body === "object") {
    try {
      const json = JSON.stringify(body);

      return {
        size: new TextEncoder().encode(json).byteLength,
      };
    } catch {
      return { size: null };
    }
  }

  // Fallback
  return { size: null };
}
