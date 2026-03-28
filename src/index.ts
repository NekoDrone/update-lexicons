import { readLexicons } from "@/read-lexicons";
import { didWebToUrl, fetchExistingLexicons, findAtprotoPds } from "@/utils";
import * as core from "@actions/core";
import { Client, ok } from "@atcute/client";
import { PasswordSession } from "@atcute/password-session";
import type {} from "@atcute/atproto";
import { publishLexicon, updateLexicon } from "@/publish-lexicon";

type LexiconResult =
    | { status: "created"; uri: string; cid: string }
    | { status: "updated"; uri: string; cid: string }
    | { status: "skipped"; nsid: string };

export const run = async () => {
    // Step 0: Get inputs.
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

    // Step 1: Read lexicons and create working array.
    const workspaceRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
    const lexicons = await readLexicons(workspaceRoot);

    core.info(`Found ${lexicons.length.toString()} lexicons in \`/lexicons\`.`);

    // Step 2: Resolve PDS service endpoint.
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

    // Step 3: Authenticate with target PDS.
    const authSession = await PasswordSession.login({
        service: atprotoService.serviceEndpoint,
        identifier: repoDid,
        password: appPassword,
    });

    const xrpcClient = new Client({
        handler: authSession,
    });

    const session = await ok(xrpcClient.get("com.atproto.server.getSession"));

    if (!session.active) {
        core.setFailed(
            `Could not create a session with target PDS. Received ${JSON.stringify(session)}`,
        );
    }

    // Step 4: Look up existing lexicons to compare diffs.
    const existingLexicons = await fetchExistingLexicons(
        xrpcClient,
        session.did,
    );

    core.info(
        `Found ${existingLexicons.size.toString()} existing lexicons on the PDS.`,
    );

    // Steps 5: Update changed lexicons, create new ones, skip unchanged.
    const promises = lexicons.map(async (lexicon): Promise<LexiconResult> => {
        const existing = existingLexicons.get(lexicon.nsid);
        const localRecord = {
            $type: "com.atproto.lexicon.schema" as const,
            ...(lexicon.lexicon as object),
        };

        if (existing) {
            if (
                JSON.stringify(localRecord) === JSON.stringify(existing.value)
            ) {
                return { status: "skipped", nsid: lexicon.nsid };
            }

            const result = await updateLexicon({
                lexiconFile: lexicon,
                client: xrpcClient,
                session,
                swapRecord: existing.cid,
            });
            return {
                status: "updated",
                uri: result.uri,
                cid: result.cid,
            };
        }

        const result = await publishLexicon({
            lexiconFile: lexicon,
            client: xrpcClient,
            session,
        });
        return {
            status: "created",
            uri: result.uri,
            cid: result.cid,
        };
    });

    const results = await Promise.allSettled(promises);

    // Step 6: Prepare output info log.
    const tableRows: Parameters<typeof core.summary.addTable>[0] = [
        [
            { data: "NSID", header: true },
            { data: "Status", header: true },
            { data: "URI / Error", header: true },
        ],
    ];

    let failCount = 0;

    for (const [i, result] of results.entries()) {
        const nsid = lexicons[i].nsid;

        if (result.status === "fulfilled") {
            const value = result.value;

            switch (value.status) {
                case "created":
                    core.info(
                        `Created ${nsid} — uri: ${value.uri}, cid: ${value.cid}`,
                    );
                    tableRows.push([nsid, "Created", value.uri]);
                    break;
                case "updated":
                    core.info(
                        `Updated ${nsid} — uri: ${value.uri}, cid: ${value.cid}`,
                    );
                    tableRows.push([nsid, "Updated", value.uri]);
                    break;
                case "skipped":
                    core.info(`Skipped ${nsid} — no changes detected.`);
                    tableRows.push([nsid, "Skipped", "No changes"]);
                    break;
            }
        } else {
            failCount++;
            const message =
                result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason);
            core.error(`Failed to publish ${nsid}: ${message}`);
            tableRows.push([nsid, "Failed", message]);
        }
    }

    await core.summary.addTable(tableRows).write();

    if (failCount > 0) {
        core.setFailed(
            `${failCount.toString()} of ${results.length.toString()} lexicons failed to publish.`,
        );
    }
};
