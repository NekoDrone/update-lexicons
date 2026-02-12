import { readLexicons } from "@/read-lexicons";

const main = async () => {
    const workspaceRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
    await readLexicons(workspaceRoot);
};

main()
    .then(() => {
        console.log("yeag");
    })
    .catch((e: unknown) => {
        console.error("Something went wrong");
        console.error(e);
    });
