const ippanelUrl = "https://edge.ippanel.com/v1/api/send";

/**
 * Forwards the original IPPanel request without interpreting its credentials,
 * Pattern configuration, or body. The destination is intentionally fixed.
 */
export async function forwardToIppanel(
  rawBody: string,
  inboundHeaders: Headers,
  fetcher: typeof fetch = fetch,
) {
  const headers = new Headers();
  for (const headerName of ["authorization", "content-type", "accept"]) {
    const value = inboundHeaders.get(headerName);
    if (value) headers.set(headerName, value);
  }

  return fetcher(ippanelUrl, {
    method: "POST",
    headers,
    body: rawBody,
    signal: AbortSignal.timeout(10_000),
  });
}
