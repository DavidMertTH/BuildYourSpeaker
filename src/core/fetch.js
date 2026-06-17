import http from "node:http";
import https from "node:https";

const MAX_REDIRECTS = 5;

export function fetchUrl(url, options = {}) {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch(url, options);
  }
  return nodeFetch(url, options);
}

function nodeFetch(url, options = {}, redirectsRemaining = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const client = requestUrl.protocol === "https:" ? https : http;
    const signal = options.signal;

    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const request = client.request(requestUrl, {
      method: options.method || "GET",
      headers: options.headers || {},
    }, (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;

      if (location && status >= 300 && status < 400 && redirectsRemaining > 0) {
        response.resume();
        resolve(nodeFetch(new URL(location, requestUrl).href, options, redirectsRemaining - 1));
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("error", reject);
      response.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve({
          ok: status >= 200 && status < 300,
          status,
          url: requestUrl.href,
          headers: {
            get(name) {
              const value = response.headers[String(name || "").toLowerCase()];
              return Array.isArray(value) ? value.join(", ") : value || null;
            },
          },
          text: async () => body.toString("utf8"),
          json: async () => JSON.parse(body.toString("utf8")),
          arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
        });
      });
    });

    const onAbort = () => request.destroy(abortError());
    signal?.addEventListener?.("abort", onAbort, { once: true });
    request.on("error", reject);
    request.on("close", () => signal?.removeEventListener?.("abort", onAbort));

    if (options.body) request.write(options.body);
    request.end();
  });
}

function abortError() {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}
