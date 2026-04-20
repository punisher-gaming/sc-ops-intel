// Streaming parser for top-level JSON arrays, yields one element at a time.
//
// Why this exists: items.json from scunpacked is 107 MB. JSON.parse() on the
// whole thing produces a JS object graph many times larger and crashes the
// 128 MB Cloudflare Worker heap. Streaming lets us hold ~1 KB at a time
// (the current in-flight item) and forget it after upserting.
//
// Approach: we walk the byte stream as text, track depth + string state to
// find object boundaries at depth 1 (the array's direct children), then
// JSON.parse just that slice. Works for any `[obj, obj, obj]` shape.
// Doesn't support arrays-of-arrays or arrays-of-primitives at the top level
//, fine for our use case (every scunpacked dump is array-of-objects).

export async function* streamJsonArray<T>(res: Response): AsyncGenerator<T> {
  if (!res.body) throw new Error("response has no body to stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buf = "";          // unprocessed text (tail of current scan window)
  let started = false;   // have we seen the opening '['?
  let depth = 0;         // current object-nesting depth inside the array
  let inString = false;  // currently inside a JSON string?
  let escape = false;    // last char was a backslash inside a string?
  let objStart = -1;     // byte offset in buf where current top-level obj began

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      // Decoder flush, push any final bytes
      buf += decoder.decode();
      break;
    }
    buf += decoder.decode(value, { stream: true });

    // Walk the new buffer character by character. We may emit multiple
    // objects per chunk; each emit truncates buf and resets i to -1.
    for (let i = 0; i < buf.length; i++) {
      const c = buf[i];

      if (!started) {
        if (c === "[") started = true;
        // Skip leading whitespace before the array
        continue;
      }

      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (c === "\\") escape = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === "{") {
        if (depth === 0) objStart = i;
        depth++;
        continue;
      }
      if (c === "}") {
        depth--;
        if (depth === 0 && objStart >= 0) {
          const slice = buf.slice(objStart, i + 1);
          let parsed: T;
          try {
            parsed = JSON.parse(slice) as T;
          } catch (err) {
            throw new Error(
              `streamJsonArray: failed to parse object at offset ${objStart}: ${(err as Error).message}`,
            );
          }
          yield parsed;
          // Drop processed prefix to keep `buf` from growing unbounded
          buf = buf.slice(i + 1);
          i = -1;
          objStart = -1;
        }
      }
      // Commas, whitespace, and the closing ']' fall through and are ignored
    }
  }
}

// Convenience helper: stream the array and call `onBatch` every `size` items.
// Useful for batched DB upserts where you don't want to materialize the full
// list. Returns the total number of items processed.
export async function streamArrayInBatches<T>(
  res: Response,
  size: number,
  onBatch: (batch: T[]) => Promise<void>,
): Promise<number> {
  let total = 0;
  let batch: T[] = [];
  for await (const item of streamJsonArray<T>(res)) {
    batch.push(item);
    total += 1;
    if (batch.length >= size) {
      await onBatch(batch);
      batch = [];
    }
  }
  if (batch.length > 0) await onBatch(batch);
  return total;
}
