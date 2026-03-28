import { resolveTxt } from "node:dns/promises";
import type { Client } from "@atcute/client";
import { ok } from "@atcute/client";

export const didWebToUrl = (did: string): string => {
    const stripped = did.slice("did:web:".length);
    const segments = stripped.split(":");
    const domain = decodeURIComponent(segments[0]);
    if (segments.length > 1) {
        const path = segments.slice(1).join("/");
        return `https://${domain}/${path}/did.json`;
    }
    return `https://${domain}/.well-known/did.json`;
};

export const findAtprotoPds = (
    data: unknown,
): { id: string; type: string; serviceEndpoint: string } | undefined => {
    if (
        typeof data !== "object" ||
        !data ||
        !("service" in data) ||
        typeof data.service !== "object" ||
        !Array.isArray(data.service)
    ) {
        return undefined;
    }
    return data.service.find((service: unknown) => {
        return (
            typeof service === "object" &&
            service &&
            "id" in service &&
            typeof service.id === "string" &&
            service.id === "#atproto_pds" &&
            "type" in service &&
            typeof service.type === "string" &&
            service.type === "AtprotoPersonalDataServer"
        );
    }) as { id: string; type: string; serviceEndpoint: string } | undefined;
};

export const nsidToLexiconDomain = (nsid: string): string => {
    const segments = nsid.split(".");
    segments.pop();
    segments.reverse();
    return `_lexicon.${segments.join(".")}`;
};

export const fetchExistingLexicons = async (
    client: Client,
    did: `did:${string}:${string}`,
): Promise<Map<string, { cid: string; value: unknown }>> => {
    const existing = new Map<string, { cid: string; value: unknown }>();
    let cursor: string | undefined;

    do {
        const res = await ok(
            client.get("com.atproto.repo.listRecords", {
                params: {
                    repo: did,
                    collection: "com.atproto.lexicon.schema",
                    limit: 100,
                    cursor,
                },
            }),
        );

        for (const record of res.records) {
            const parts = record.uri.split("/");
            const rkey = parts[parts.length - 1];
            existing.set(rkey, { cid: record.cid, value: record.value });
        }

        cursor = res.cursor;
    } while (cursor);

    return existing;
};

export const resolveLexiconDid = async (
    nsid: string,
): Promise<string | undefined> => {
    const domain = nsidToLexiconDomain(nsid);
    try {
        const records = await resolveTxt(domain);
        for (const chunks of records) {
            const record = chunks.join("");
            if (record.startsWith("did=")) {
                return record.slice("did=".length);
            }
        }
        return undefined;
    } catch {
        return undefined;
    }
};
