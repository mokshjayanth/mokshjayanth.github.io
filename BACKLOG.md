# Backlog

Parked ideas and small fixes. Not commitments — each gets a closer look
before it's picked up.

## Move the deploy workflow off Node 20

The Pages deploy warns that `actions/checkout@v4`, `actions/setup-node@v4`
and `actions/upload-artifact@v4` (pulled in by `upload-pages-artifact`)
target the deprecated Node 20 runtime and are being forced onto Node 24.
Deploys still succeed. Fix: bump `.github/workflows/deploy.yml` to the
current major versions of those actions, push, and check the warning is
gone.

## Revisit the type

A pencil-themed design is the idea. Spectral was tried and reverted
(`eb4170b`) in favour of system fonts: nothing to download, a decent
book face on every device. Name what the current type gets wrong before
choosing a replacement. Any webfont should be self-hosted — a request to
Google Fonts would add a third party the privacy page would have to
mention.
