import { readdir, readFile } from "fs/promises";
import { extname, join, relative, resolve } from "path";

export interface LexiconFile {
    relativePath: string;
    nsid: string;
    lexicon: unknown;
}

export const readLexicons = async (workspaceRoot: string) => {
    const lexiconsDir = resolve(workspaceRoot, "lexicons");

    const entries = await readdir(lexiconsDir, {
        recursive: true,
        withFileTypes: true,
    });

    const files: LexiconFile[] = [];

    for (const entry of entries) {
        if (!entry.isFile() || extname(entry.name) !== ".json") continue;

        const parentDir = entry.parentPath;
        const fullPath = join(parentDir, entry.name);
        const relativePath = relative(lexiconsDir, fullPath);

        const raw = await readFile(fullPath, "utf-8");
        const content: unknown = JSON.parse(raw);

        // basic sanity checks
        if (typeof content !== "object" || !content) {
            console.warn(
                "Parsed .json file was not a properly formatted json object. Check your inputs.",
            );
            continue;
        }

        // check for id matching location of file
        if (!("id" in content)) {
            console.warn(
                "Skipping lexicon with no `id` field. Found at",
                `\`${relativePath}\`.`,
                "Per the spec, you need to provide an `id` field in the json with a value equal to the fully qualified NSID of the lexicon, with no fragments.",
            );
            continue;
        }
        const nsid = relativePath.split(".")[0].split("/").join(".");
        if (content.id !== nsid) {
            console.warn(
                "Skipping lexicon with incorrect ID",
                `\`${content.id as string}\``,
                "found at",
                `\`${relativePath}\`.`,
                "Please ensure that your lexicon IDs match where they're supposed to be in the /lexicons directory.",
            );
            continue;
        }

        // check for lexicon field value 1 (as per spec)
        if (!("lexicon" in content)) {
            console.warn(
                "Skipping lexicon with no `lexicon` field. Found at",
                `\`${relativePath}\`.`,
                "Per the spec, you need to provide a `lexicon` field in the json with a value of 1.",
            );
            continue;
        }
        if (content.lexicon !== 1) {
            console.warn(
                "Skipping lexicon with incorrect value",
                `\`${(content.lexicon as number).toString()}\``,
                "found at",
                `\`${relativePath}\`.`,
                "Per the spec, please ensure that this is set to 1.",
            );
            continue;
        }

        if (!("defs" in content)) {
            console.warn(
                "Skipping lexicon with no `defs` field. Found at",
                `\`${relativePath}\`.`,
                "If the defs field is empty then you don't have a lexicon. This shouldn't happen!!!!",
            );
        }

        files.push({
            relativePath,
            nsid,
            lexicon: JSON.parse(raw),
        });
    }

    return files;
};
