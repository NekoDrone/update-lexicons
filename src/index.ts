import { readLexicons } from "@/read-lexicons";
import * as core from "@actions/core";

const didWebToUrl = (did: string): string => {
    const stripped = did.slice("did:web:".length);
    const segments = stripped.split(":");
    const domain = decodeURIComponent(segments[0]);
    if (segments.length > 1) {
        const path = segments.slice(1).join("/");
        return `https://${domain}/${path}/did.json`;
    }
    return `https://${domain}/.well-known/did.json`;
};

const findAtprotoPds = (
    data: unknown,
):
    | { id: string; type: string; serviceEndpoint: string }
    | undefined => {
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

export const run = async () => {
    const repoDid = core.getInput("repo-did", { required: true });
    if (!repoDid.startsWith("did:plc:") && !repoDid.startsWith("did:web:")) {
        core.setFailed(
            `Provided input repo-did must be a did:plc or did:web. Please check the input. We got ${repoDid}`,
        );
        return;
    }
    const appPassword = core
        .getInput("app-password", { required: true })
        .trim();
    if (appPassword === "")
        core.warning(
            "Provided input app-password is an empty string. Are you sure you've provided one?",
        );

    const workspaceRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
    const lexicons = await readLexicons(workspaceRoot);

    core.info(`Found ${lexicons.length.toString()} lexicons in \`/lexicons\`.`);

    let didDocUrl: string;
    if (repoDid.startsWith("did:plc:")) {
        core.info(
            "Provided repo's DID is a `did:plc`. Resolving with plc.directory.",
        );
        didDocUrl = `https://plc.directory/${repoDid}`;
    } else {
        core.info(
            "Provided repo's DID is a `did:web`. Resolving via .well-known/did.json lookup.",
        );
        didDocUrl = didWebToUrl(repoDid);
    }

    core.info(`Making request to ${didDocUrl}`);
    const req = new Request(didDocUrl);
    const res = await fetch(req);
    const data: unknown = await res.json();

    const atprotoService = findAtprotoPds(data);
    if (!atprotoService) {
        core.error(
            "DID document did not contain a valid #atproto_pds service.",
        );
        core.setFailed(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- We want to explicitly cast and show it as-is.
            `DID document did not contain a valid service array. Received, ${data}`,
        );
        return;
    }

    console.log(atprotoService);
};
