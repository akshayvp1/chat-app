import dns from "dns";

const FALLBACK_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];

function isSrvMongoUri(uri: string): boolean {
  return uri.trim().toLowerCase().startsWith("mongodb+srv://");
}

function extractSrvHostname(uri: string): string | null {
  try {
    const withoutScheme = uri.replace(/^mongodb\+srv:\/\//i, "");
    const authority = withoutScheme.split("/")[0] ?? "";
    const hostPart = authority.includes("@")
      ? authority.slice(authority.lastIndexOf("@") + 1)
      : authority;
    const host = hostPart.split(",")[0]?.trim() ?? "";
    return host.length > 0 ? host : null;
  } catch {
    return null;
  }
}

function shouldRetryWithFallback(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "ECONNREFUSED" || code === "ETIMEOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN";
}

async function resolveSrv(hostname: string): Promise<void> {
  await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
}

export async function configureMongoDns(mongoUri: string): Promise<void> {
  if (!isSrvMongoUri(mongoUri)) return;

  const hostname = extractSrvHostname(mongoUri);
  if (!hostname) return;

  const initialServers = dns.getServers();

  try {
    await resolveSrv(hostname);
    return;
  } catch (error) {
    if (!shouldRetryWithFallback(error)) {
      console.warn(
        "[mongo-dns] Initial SRV lookup failed with current DNS servers:",
        initialServers.join(", ") || "(none)",
        (error as { code?: string; message?: string }).code ?? "",
        (error as { message?: string }).message ?? String(error)
      );
      return;
    }

    console.warn(
      "[mongo-dns] SRV lookup failed with current DNS servers:",
      initialServers.join(", ") || "(none)",
      "- retrying with fallback resolvers"
    );
  }

  dns.setServers(FALLBACK_DNS_SERVERS);

  try {
    await resolveSrv(hostname);
    console.log("[mongo-dns] Using fallback DNS servers for SRV resolution:", FALLBACK_DNS_SERVERS.join(", "));
  } catch (error) {
    console.error(
      "[mongo-dns] SRV lookup failed after DNS fallback:",
      (error as { code?: string; message?: string }).code ?? "",
      (error as { message?: string }).message ?? String(error)
    );
  }
}

export function getMongoDnsServers(): string[] {
  return dns.getServers();
}
