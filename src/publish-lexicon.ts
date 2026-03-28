import type { LexiconFile } from "@/read-lexicons";
import type { ComAtprotoServerGetSession } from "@atcute/atproto";
import type { Client } from "@atcute/client";
import { ok } from "@atcute/client";

export const updateLexicon = async ({
    lexiconFile,
    client,
    session,
    swapRecord,
}: {
    lexiconFile: LexiconFile;
    client: Client;
    session: ComAtprotoServerGetSession.$output;
    swapRecord: string;
}) => {
    const lexicon = lexiconFile.lexicon as object;
    return await ok(
        client.post("com.atproto.repo.putRecord", {
            input: {
                repo: session.did,
                collection: "com.atproto.lexicon.schema",
                record: {
                    $type: "com.atproto.lexicon.schema",
                    ...lexicon,
                },
                rkey: lexiconFile.nsid,
                swapRecord,
            },
        }),
    );
};

export const publishLexicon = async ({
    lexiconFile,
    client,
    session,
}: {
    lexiconFile: LexiconFile;
    client: Client;
    session: ComAtprotoServerGetSession.$output;
}) => {
    const lexicon = lexiconFile.lexicon as object;
    return await ok(
        client.post("com.atproto.repo.createRecord", {
            input: {
                repo: session.did,
                collection: "com.atproto.lexicon.schema",
                record: {
                    $type: "com.atproto.lexicon.schema",
                    ...lexicon,
                },
                rkey: lexiconFile.nsid,
            },
        }),
    );
};
