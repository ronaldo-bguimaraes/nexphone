# Contributing to NexPhone

Thanks for your interest in NexPhone. This project is built in the open, and contributions of
every size are welcome: code, documentation, tests, designs, bug reports and deployment recipes.

Before contributing, please read the [project constitution](.specify/memory/constitution.md).
It defines the non-negotiable principles that every change must respect — above all local-first
operation, subsystem separation, user control, privacy and open-source licensing.

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

NexPhone distinguishes two contribution classes (see
[Community and Ecosystem Governance](.specify/memory/constitution.md#community-and-ecosystem-governance)):

1. **Core contributions** — changes to the main platform (Android runtime adapters, AI engine,
   clients, infrastructure). These are reviewed by core maintainers and must preserve
   architectural consistency, security, compatibility and project direction.
2. **Ecosystem contributions** — independent extensions, adapters, integrations and tools that
   can be developed and maintained in separate repositories against the documented public
   interfaces. You do not need to modify the core to build these.

You do not need to understand the whole codebase to contribute to an isolated component.

## Before you start

- Search [existing issues](https://github.com/ronaldo-bguimaraes/nexphone/issues) and
  [discussions](https://github.com/ronaldo-bguimaraes/nexphone/discussions) to avoid duplicates.
- For anything larger than a small fix, open an issue or discussion first so we can agree on the
  approach before you invest time.
- **Do not report security vulnerabilities publicly.** Follow [SECURITY.md](SECURITY.md).
- Read the [reference architecture](docs/architecture.md), [UI Engine
  specification](docs/ui-engine.md), [interaction modes](docs/interaction-modes.md) and
  [authorization model](docs/authorization.md) before changing cross-cutting behavior.
- Significant architectural changes require an **Architecture Decision Record (ADR)**. See
  [`docs/adr/`](docs/adr/README.md).

## Spec-driven workflow

Specifications live in the repository and are produced with GitHub Spec Kit. The typical flow is:

1. `/speckit.specify` — describe the feature or change and its observable behavior.
2. `/speckit.plan` — produce the implementation plan and design artifacts.
3. `/speckit.tasks` — break the plan into ordered, verifiable tasks.
4. `/speckit.implement` — execute the tasks.

Specifications must include measurable acceptance criteria, separate functional and
non-functional requirements, and address security and privacy. See the constitution for the full
requirements.

## Development setup

NexPhone targets **Linux** as its initial deployment platform. The historical deployment model is
local and container-based, so the host is expected to provide:

- A recent 64-bit Linux distribution.
- A container runtime (Docker or Podman).
- KVM enabled and accessible for the Android runtime.
- `adb` from the Android platform tools for device-level inspection.
- Git and the toolchain for the component you are working on.

Component-specific toolchains, pinned versions and reproducible environment definitions are
introduced alongside the first implementation of each subsystem and recorded in an ADR. When a
component gains a documented setup, it is linked from this section.

> **Status:** the repository currently contains governance and specification artifacts only.
> Concrete setup instructions will be added as the first components land.

## Coding standards

- Match the style, naming and structure of the surrounding code.
- Keep components modular and respect subsystem boundaries (Android Runtime, AI Engine, Client).
  Internal implementation details must not leak across boundaries.
- Document public interfaces, protocols and data formats.
- Prefer established standards over custom protocols unless an ADR justifies the choice.
- Add no new dependency without a reason. Check licensing compatibility (the project is
  Apache-2.0 and favors permissively licensed dependencies).
- Never commit secrets, credentials, tokens or personal data. Logs must not contain sensitive
  information.
- Formatting and linting rules are specified per component; run them before opening a pull
  request.

## Testing expectations

Every change must include an appropriate testing strategy:

- New behavior comes with tests that fail before the change and pass after it.
- Bug fixes come with a regression test whenever practical.
- Runtime adapters are tested against the documented runtime contract, not against a single
  implementation.
- Changes that cross subsystem boundaries include contract tests.
- Security-relevant changes include tests for the authorization path, which is enforced outside
  the LLM.

Report how you tested your change in the pull request. If something is not covered, say so
explicitly.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <imperative summary>

<optional body explaining what and why>
```

Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`.
Keep commits focused; one logical change per commit where practical.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep the change small and focused. Prefer several reviewable pull requests over one large one.
3. Complete the pull request template, including the subsystem, contribution class and
   constitution checklist.
4. Link the related issue or specification.
5. Make sure tests, linting and documentation updates are included.
6. Respond to review feedback; maintainers may ask for changes, splits or an ADR.

Core contributions require approval from a core maintainer before merge. Contribution decisions
are documented in the pull request or issue. Draft pull requests are welcome for early feedback.

## Architecture Decision Records

Significant decisions — affecting subsystem boundaries, security, persistence, compatibility or
deployment — must be documented as ADRs in [`docs/adr/`](docs/adr/README.md). Copy the template,
use the next sequential number, and submit the ADR with the change it describes.

## Licensing of contributions

NexPhone is licensed under the [Apache License 2.0](LICENSE). By submitting a contribution, you
agree that it is your original work (or that you have the right to submit it) and that it is
licensed under the same terms. No separate contributor license agreement is required. Do not
submit code you cannot license this way.

## Questions

Open a [discussion](https://github.com/ronaldo-bguimaraes/nexphone/discussions) or an issue. For
conduct concerns, follow
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
