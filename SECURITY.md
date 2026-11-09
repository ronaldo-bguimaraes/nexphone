# Security Policy

NexPhone runs a persistent Android environment and an AI engine on user-controlled hardware. We
take security and privacy reports seriously and welcome good-faith research.

## Supported versions

NexPhone is pre-release. Until the first stable release, only the latest commit on `main` receives
security fixes.

| Version        | Supported |
| -------------- | --------- |
| `main`         | Yes       |
| Tagged releases | No       |

This table will be updated when versioned releases begin.

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request for a security problem.**

Use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Describe the issue with enough detail to reproduce it.

If private reporting is unavailable, contact a maintainer directly
([@ronaldo-bguimaraes](https://github.com/ronaldo-bguimaraes)) and ask for a private channel
before sharing details.

### What to include

- A description of the vulnerability and its impact.
- Affected component(s) and version, commit or deployment configuration.
- Reproduction steps or a proof of concept.
- Any known mitigations or workarounds.
- Whether you intend to disclose publicly, and on what timeline.

Do not include real credentials, personal data or third-party private information in the report.
Use test accounts and redacted logs.

## What to expect

These are targets, not guarantees:

- **Acknowledgement:** within 3 business days.
- **Initial triage and severity assessment:** within 10 business days.
- **Fix or mitigation plan:** communicated after triage, depending on severity and complexity.

We will keep you informed of progress and credit you in the advisory unless you ask to remain
anonymous.

## Coordinated disclosure

We follow coordinated disclosure. We ask that you give us a reasonable opportunity to fix the
issue before publishing details. In return, we will not pursue legal action against researchers
who act in good faith, avoid privacy violations and data destruction, and do not exploit the issue
beyond what is needed to demonstrate it.

Once a fix is available, we will publish an advisory describing the issue and its remediation.

## Scope

In scope:

- The NexPhone core platform and its documented interfaces.
- Android runtime adapters and their contract handling.
- Clients (mobile, web) and their authentication and transport.
- AI engine, orchestration and tool/agent execution paths.
- Authorization enforcement outside the LLM.
- Secret storage, credential handling and host-system isolation.
- Data persistence and backup paths.

Out of scope:

- Vulnerabilities in third-party Android applications running inside the environment.
- Issues that require the attacker to already control the host, the container runtime or the user's
  account.
- Denial of service against a self-hosted instance by its own operator.
- Optional external services, model providers and integrations operated by third parties.
- Missing hardening in a deliberately permissive development configuration.
- Social engineering, spam and physical attacks.

## Hardening guidance for self-hosters

- Do not expose the platform directly to the public internet without a reverse proxy, TLS and
  authentication.
- Keep Android instances isolated from the host; do not grant them unrestricted host privileges.
- Run the platform under a dedicated, unprivileged user and keep the host patched.
- Protect credentials and model provider keys; never commit them or place them in logs.
- Keep backups of persistent environment data and test restores.
- Review authorization policies for sensitive actions before delegating workflows to the AI.
