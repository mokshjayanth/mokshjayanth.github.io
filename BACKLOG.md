# Backlog

Parked ideas and small fixes. Not commitments — each gets a closer look
before it's picked up.

## Keep the deploy workflow current

Both are warnings, not failures — deploys still succeed — and both are
fixed in `.github/workflows/deploy.yml`.

- **Node 20.** `actions/checkout@v4`, `actions/setup-node@v4` and
  `actions/upload-artifact@v4` (pulled in by `upload-pages-artifact`)
  target the deprecated Node 20 runtime and are being forced onto
  Node 24. Bump them to their current major versions.
- **Ubuntu 26.** `ubuntu-latest` began moving to Ubuntu 26 on
  19 October 2026. Builds on it pass so far. Either pin a version
  (`ubuntu-24.04`) for predictability, or stay on `latest` and watch
  the next few runs.

Push, and check the annotations are gone.

## Link the policy-adherence preprint from the P vs NP essay

Once the SRE agent policy-adherence preprint is out, link it from the
essay's "a rule an AI is told is not a rule it's held to" line, and
publish its side quest entry (parked as a draft) with the preprint link.
