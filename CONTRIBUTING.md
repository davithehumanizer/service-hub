# Contributing

Contributions are welcome as pull requests. Open them against `dev`: `main` is
what runs in production, and it only moves forward from `dev`.

## Licence of contributions

The Service Hub is published under `AGPL-3.0-only`. By submitting a
contribution, you agree that it is published under the same licence
("inbound = outbound"). There is no contributor licence agreement to sign.

## Sign off your commits

Every commit must carry a `Signed-off-by:` line, which certifies the
[Developer Certificate of Origin 1.1](https://developercertificate.org): you
wrote the change, or you have the right to submit it under the project's
licence. Git adds the line for you:

```bash
git commit -s
```

A pull request with a commit that is not signed off cannot be merged.

## Before opening a pull request

- Follow the conventions in force, described in [CLAUDE.md](CLAUDE.md):
  conventional commit messages, a DTO for every input, migrations rather than
  `synchronize`, and the four locales kept in step.
- Run `npm run test` in each backend service you changed. It fails below the
  coverage thresholds, not only on a failing test.
- The frontend has no automated tests: say in the pull request how you checked
  the change in a browser.

## Reporting a security issue

Do not open a public issue. Use the "Report a vulnerability" button in the
repository's Security tab, which reaches the maintainers privately.
