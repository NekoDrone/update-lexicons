# update-lexicons

github action to automate updating your [atproto](https://atproto.com) lexicons to a pds repo.

## lexicon discovery and resolution

as described by the [lexicon resolution](https://atproto.com/specs/lexicon#lexicon-publication-and-resolution) spec, you can perform resolution of a lexicon definition through dns for a particular namespace and nsid. if you already know this or just don't care, you can skip ahead to usage.

specifically, if you have a lexicon collection, e.g. `dev.sylfr.feed.post`, you can resolve all other `dev.sylfr.feed.*` lexicons by doing the following.

1. on a pds repository, for each lexicon in that collection, create a record under the `com.atproto.lexicon.schema` collection with the record-key as the full nsid of that lexicon. e.g. `dev.sylfr.feed.getPost`.
2. setup your dns to return the did of that repository in a TXT record when queried at the mirror of the lexicon collection namespace with `_lexicon` prepended. e.g. `_lexicon.feed.sylfr.dev` (drop the name of the lexicon itself, `getPost`.) which would return `did:plc:<whatever>` or even `did:web:<whatever>` in a TXT record.

this allows for two things. the first is that the controlling authority of the domain can now officially state what their lexicons are. since bluesky social pbc controls `bsky.app`, all of the lexicons under `app.bsky.*` are under pbc's control and authority.

secondly, this allows for any other tool or service to automatically discover and resolve all of the lexicons under a namespace. [pdsls](https://pdsls.dev/) now supports automatic resolution of a lexicon to its definition through this method.

this tool allows you to perform the updating of your lexicons to a repo as part of a ci flow. (only github action for now, tangled spindle coming soon!)

## usage

### prerequisites

- a PDS repository with a `did:plc` or `did:web`
- an [app password](https://bsky.app/settings/app-passwords) for that repository

### lexicon file setup

place your lexicon JSON files in a `lexicons/` directory at the root of your project. the directory structure should mirror the NSID segments of each lexicon.

for example, for the NSID `dev.sylfr.feed.like`:

```
lexicons/
  dev/
    sylfr/
      feed/
        like.json
```

the action reads this directory recursively, so you can have as many lexicons as you need.

### workflow example

```yaml
name: Publish Lexicons
on:
  push:
    branches: [main]
    paths:
      - "lexicons/**"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: NekoDrone/update-lexicons@v1
        with:
          repo-did: ${{ secrets.REPO_DID }}
          app-password: ${{ secrets.APP_PASSWORD }}
```

add `REPO_DID` and `APP_PASSWORD` as [repository secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) in your GitHub repo settings.

### inputs

| input | required | description |
|---|---|---|
| `repo-did` | yes | `did:plc` or `did:web` of the target repository |
| `app-password` | yes | app password that allows writes to the repository |

### what the action does

1. resolves your DID document (via [plc.directory](https://plc.directory/) for `did:plc`, or `.well-known/did.json` for `did:web`) to find the PDS service endpoint.
2. authenticates with the PDS using the provided app password.
3. reads all lexicon files from `lexicons/` recursively.
4. fetches existing `com.atproto.lexicon.schema` records from the repo and compares them — creates new records, updates changed ones, and skips unchanged ones.
5. verifies DNS TXT records for each lexicon namespace (e.g. `_lexicon.feed.sylfr.dev`) and warns if they don't point to the expected DID.
6. outputs a summary table of results to the GitHub Actions job summary.
