# Getting started

DORA Compliance Scanner is a browser-only self-assessment over 19 plain-language requirements from Chapters II–VI of Regulation (EU) 2022/2554. It records whether evidence is Present, Partial or Missing and reports coverage by chapter and overall.

## Try it

Open the [live scanner](https://jeevan-0508.github.io/dora-compliance-scanner/). Work through the requirements, review the coverage summary, and follow the official regulation link before treating any result as an action input.

Answers stay in the browser's local storage. No account, API or server-side data store is part of the repository.

## Run locally

Serve the static files over HTTP:

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173/>; the root page redirects to `docs/`.

## Scope boundary

This is an orientation and evidence-tracking tool, not a compliance certification, legal opinion, audit result or claim of financial-services experience. Its model is a plain-language summary of selected chapters and should be checked against the official regulation and qualified advice.
