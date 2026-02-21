import { readLexicons } from "@/read-lexicons";
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

    if (repoDid.startsWith("did:plc:")) {
        core.info(
            "Provided repo's DID is a `did:plc`. Resolving with plc.directory.",
        );
        const url = `https://plc.directory/${repoDid}`;
        core.info(`Making request to ${url}`);
        const req = new Request(url);
        const res = await fetch(req);
        const data: unknown = await res.json();
        if (
            typeof data !== "object" ||
            !data ||
            !("service" in data) ||
            typeof data.service !== "object" ||
            !Array.isArray(data.service)
        ) {
            core.error(
                "plc.directory did not return the expected object. Did it get a breaking change?",
            );
            core.setFailed(
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- We want to explicitly cast and show it as-is.
                `Response received from plc.directory was not an object. Received, ${data}`,
            );
            return;
        }
        const atprotoService: {
            id: string;
            type: string;
            serviceEndpoint: string;
        } = data.service.find((service: unknown) => {
            const isAtprotoPdsService =
                typeof service === "object" &&
                service &&
                "id" in service &&
                typeof service.id === "string" &&
                service.id === "#atproto_pds" &&
                "type" in service &&
                typeof service.type === "string" &&
                service.type === "AtprotoPersonalDataServer";
            return isAtprotoPdsService;
        }) as {
            id: string;
            type: string;
            serviceEndpoint: string;
        };

        console.log(atprotoService);
    } else {
        core.info(
            "Provided repo's DID is a `did:web`. Resolving via .well-known/did.json lookup.",
        );
    }
};
