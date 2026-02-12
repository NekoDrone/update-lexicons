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

\[TODO\] but tl;dr, provide it as an action, then provide the did of a repo where you'd like to host the records, as well as the password for accessing that repo (i don't think i can ever support oauth cause this is ci) as action secrets.

the action will resolve your did through [plc.directory](https://plc.directory/), read your lexicons under `lexicons/` at your project root, and then publish the records it finds (recursively).
