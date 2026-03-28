import { readLexicons } from "@/read-lexicons";
import { didWebToUrl, findAtprotoPds } from "@/utils";
import * as core from "@actions/core";

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
