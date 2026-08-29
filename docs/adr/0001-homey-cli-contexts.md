# ADR 0001: Introduce Homey CLI contexts

- Status: Accepted
- Decision owners: Homey CLI maintainers
- Last updated: 2026-08-29

## Context

The CLI currently persists one globally selected Homey as `activeHomey`. API commands can override
that selection with `--homey-id`, while app commands resolve the selected Homey implicitly. The CLI
also has one cached authenticated account per process.

We want named contexts that make target selection explicit and reusable without turning a context
into a general-purpose command configuration profile.

## Decisions

### Context boundary

A context represents a target connection. It identifies which Homey to address, how the CLI should
connect to it, and which account and/or direct Homey credentials are available.

A context does not own presentation or project defaults such as output format, app path, build
options, or validation level.

### Initial use cases

The first release must support:

- developers switching among personal, development, and production Homeys;
- non-interactive CI targeting with environment-provided credentials;
- multiple Athom accounts on one machine.

Team sharing and context import/export are not yet decided.

### Backward compatibility

The existing `homey list`, `homey select`, `homey select current`, and `homey unselect` commands
remain supported. They will act as compatibility views or aliases over the context system without
changing their existing structured output contracts.

### Authentication ownership

Authentication profiles are independent, named entities. A profile owns the authentication state
for one Athom account, and any number of contexts may reference it. Contexts never own or duplicate
account credentials.

### Persistence scope

Authentication profiles and context definitions are user-global. App repositories do not contain
context definitions or credential references in the first release.

Project-level configuration may eventually select a global context by name, but that is outside the
initial scope.

### Context uniqueness

A context name is globally unique within the user's CLI state. The Homey ID, authentication profile,
and connection policy do not need to be unique: several contexts may intentionally address the same
Homey through different accounts or connection policies.

### Authentication-profile identity

Each authentication profile has a user-chosen, user-global unique name. After authentication, the
profile stores the canonical Athom account ID as verified identity metadata. Email address and
display name are descriptive metadata and may change without changing profile identity.

Authentication profiles support two credential-source kinds:

- persistent OAuth authentication for interactive users;
- a named environment variable containing a PAT for non-interactive use.

The environment variable name may be persisted. Its secret value must not be persisted by the
context system.

### Credential storage choice

Persistent OAuth credentials may be stored either in the operating system credential store or in
the existing local settings file. The user explicitly chooses the storage backend; the CLI must not
silently fall back from the credential store to the settings file.

Existing file-backed logins remain file-backed and usable. They must not be automatically migrated
in a way that triggers credential-store, biometric, fingerprint, or password prompts.

The CLI maintains a global credential-storage default and supports a per-authentication-profile or
per-direct-credential override. Existing installations retain the settings-file backend by default.
Changing the default affects only credentials created afterward and never migrates existing secrets.
Migration is a separate, explicit user action.

### Current context

The CLI maintains one user-global current context. Commands may override it through an environment
variable or explicit command-line option.

Context selection follows this precedence:

1. explicit `--context <name>`;
2. `HOMEY_CONTEXT`;
3. the persisted current context;
4. the migrated legacy `activeHomey` selection.

### Login and logout compatibility

The CLI introduces explicit authentication-profile commands such as `homey auth login <profile>`
and `homey auth logout <profile>`.

Legacy `homey login`, `homey logout`, and `homey whoami` operate on the authentication profile of
the current context when one is set. When no current context is set, they operate on the reserved
`default` authentication profile.

Logging out removes the profile's usable credentials but does not delete contexts that reference
the profile. Those contexts become visibly unauthenticated.

### Direct Homey authentication

A context may combine:

- an authentication profile for Athom account access;
- a direct Homey API token and address or address-resolution information;
- both forms of authentication.

When direct Homey authentication is present, it takes precedence for Homey-scoped operations.
Account-scoped operations use the authentication profile. A context with only direct Homey
authentication cannot perform account-scoped operations and must report that limitation clearly.

The raw direct token is not embedded in the context record. The context stores either an opaque
credential ID plus its storage backend or the name of an environment variable that supplies the
token. Stored secret material lives in the selected credential backend.

Direct Homey authentication never falls back automatically to account-mediated authentication when
authentication or authorization fails. A user may explicitly select account authentication for a
command.

Target requirements depend on the available authentication:

- account authentication only requires a Homey ID; an address is optional;
- direct Homey authentication only requires an address; a Homey ID is optional metadata;
- both authentication forms require a Homey ID; the account may resolve an address when none is
  stored.

### Operation authentication scope

Authentication scope is explicit at the API boundary:

- local operations instantiate neither API client and require no authentication;
- account-scoped operations use `AthomCloudAPI`;
- Homey-scoped operations use `HomeyAPI`;
- workflows that use both clients require both authentication capabilities.

Generated operations inherit their scope from their owning API class rather than duplicating scope
metadata on every command. The CLI must not infer scope from command names or try credentials until
an operation succeeds.

### Identifier syntax

Authentication-profile and context names use lowercase, shell-safe identifiers between 1 and 64
characters. They must match `^[a-z0-9][a-z0-9._-]{0,63}$`.

Human-readable display names and descriptions are metadata and are not subject to this identifier
syntax.

### Connection policy

A context exposes connection strategies using the existing `homey-api` strategy vocabulary rather
than introducing friendly aliases such as `lan` or `remote`.

USB is always opt-in. It must never appear in an automatic or default strategy selection.

A discovery route may enable one or more raw `homey-api` strategies, including combinations that do
not appear useful. Strategy preference belongs to `homey-api`; the context describes allowed routes
rather than inventing a separate preference algorithm. Cloud must remain the least-preferred route.

The caller's strategy array is an allow-list rather than a preference order. Route selection delegates
entirely to `homey-api`. With `localSecure` enabled, that strategy is tried first; after it fails,
other enabled routes including cloud may race. Cloud is therefore allowed to win such a race.

USB and configured-address routes are exclusive endpoint overrides with no automatic discovery
fallback. A user selects another context to use another route.

The default discovery allow-list is `localSecure`, `local`, `remoteForwarded`, and `cloud`. It does
not include `mdns`, USB, or a configured address. A Homey Cloud target uses only `cloud` from that
set.

Accepting the default expands and persists that concrete allow-list in the context. Existing
contexts therefore do not change route behaviour after a CLI upgrade. An explicit update to the
then-current default is required to adopt future default changes.

Context creation and updates reject unknown strategy names, remove duplicates, and require at least
one strategy for a discovery route. Recognized but currently incompatible or unavailable strategies
may be stored; inspection and diagnosis expose their usability.

`homey-api` defines the discovery strategies `mdns`, `cloud`, `local`, `localSecure`, and
`remoteForwarded`. USB and a configured direct address are not discovery strategies: they override
the resolved API base URL. Discovery strategy and endpoint override are therefore separate context
concepts. USB remains opt-in and is never selected by an automatic endpoint policy.

### Context creation and activation

Creating a context does not make it current unless the user supplies `--use`. Interactive and
non-interactive creation follow the same rule.

### Persistence layout

Context state, authentication-profile metadata, and settings-backed credential entries use separate,
versioned namespaces within the existing CLI settings file. Secrets stored through the operating
system credential backend remain outside that file.

Changing these schemas requires explicit migrations keyed by each namespace's schema version.

### Missing current context

When no explicit, environment, persisted, or legacy context resolves for a target-dependent command:

- an interactive TTY launches guided context selection or creation and makes the result current;
- a non-interactive process fails with an actionable error.

### Explicit targeting overlays

An explicit `--homey-id`, `--address`, or `--token` overlays the corresponding field from the
resolved context. Existing option-combination validation still applies after the overlay. Explicit
flags do not cause the CLI to ignore the context's remaining authentication or connection data.

### Effective context lifetime

The CLI resolves context data, overlays, credentials, and operation requirements once at command
start. It passes an immutable effective-context snapshot through the entire workflow. Long-running
commands and cleanup handlers never re-read the persisted current context.

### Authentication override

Target-dependent commands accept `--auth auto|homey|account`:

- `auto` selects authentication from operation scope and available context capabilities without
  falling back after a failure;
- `homey` requires direct Homey authentication;
- `account` requires account authentication, including account-mediated Homey authentication.

An override incompatible with the operation's declared scope fails before execution.

### Broken references

Removing an authentication profile or context may leave references from other stored objects. The
CLI does not cascade deletions and does not refuse removal solely because references exist.

Inspection and execution validate references. A context with a missing profile or credential is
reported as broken and cannot perform operations that require the missing capability. Logging out
removes usable credentials but preserves profile metadata and referencing contexts.

Context health is capability-aware:

- `ready` means all configured references are usable;
- `degraded` means a configured capability is broken but the requested operation can still run;
- `unusable` means the requested operation's required capability cannot resolve.

Listing and inspection expose health and reasons. Human output warns before a degraded operation;
structured output remains machine-clean. Unusable operations fail before connecting.

Removing an object that has dependants is permitted but shows those dependants and the resulting
health impact. Interactive removal requires confirmation; non-interactive removal requires `--yes`.

### Management command vocabulary

Context management provides `create`, `ls`, `show`, `inspect`, `use`, `update`, `rename`, `rm`, and
`diagnose`. Authentication-profile management provides `login`, `ls`, `inspect`, `logout`, `remove`,
and `migrate`.

The long forms `list` and `remove` are accepted as discoverable aliases for `ls` and `rm` where
applicable.

Authentication profiles do not have an independently selected current profile. A context selects
the authentication profile. The reserved `default` profile is used only when no context exists or
through legacy compatibility behaviour.

Context updates patch only supplied fields; explicit `--unset-*` options clear optional values.
Context renames atomically update the current-context pointer. Authentication-profile renames
atomically update all context references.

Removing the current context is permitted after dependant warning/confirmation. Its persisted name
becomes a broken current reference until the user selects another context or runs `homey unselect`.
Deletion never cascades.

### Creation-time validation

`homey context create` validates schema and invariants without requiring a live connection. Users
may request a connection check with `--check` or run `homey context diagnose <name>` later.

### Context creation interface

One `homey context create <name>` command supports account-backed, direct-only, and hybrid contexts.
Flags determine the supplied capabilities; an interactive invocation prompts only for missing
required values.

Direct tokens may be read from a named environment variable, standard input, or a hidden interactive
prompt. Context creation does not accept a literal token option that would expose a secret in shell
history.

Route flags infer one mutually exclusive route shape:

- no route flag expands the default discovery allow-list;
- repeatable `--strategy <name>` creates a discovery allow-list;
- `--usb` creates a USB-only route;
- `--address <url>` creates an explicit-address route.

`--strategy`, `--usb`, and `--address` are mutually exclusive. Updates use the same options to
replace the route and explicit `--unset-*` options to clear optional authentication capabilities.

### Inspection contract

`homey context ls` shows the current marker, name, target, authentication profile, available
capabilities, route, and health. `homey context show` reports the effective context name and the
selection source. `homey context inspect` reports complete redacted configuration, resolved metadata,
and health reasons.

All inspection commands support structured JSON output. They never show credential values or the
contents of referenced environment variables.

### Legacy selection mapping

The context and authentication-profile identifier `default` are reserved for legacy compatibility.

- Existing `activeHomey` state migrates to context `default`.
- Existing account authentication migrates to authentication profile `default`.
- `homey select` creates or updates context `default` and makes it current.
- `homey select current` returns the current context's target using its existing exact output shape.
- `homey unselect` clears the current context without deleting any context.

### Legacy-state migration

Legacy authentication and selection are exposed lazily through compatibility adapters:

- existing `homeyApi` authentication appears as profile `default` without moving its tokens;
- existing `activeHomey` appears as context `default`;
- help, completion, and unrelated local commands perform no migration writes;
- versioned state is materialized only when authentication/context state is mutated;
- legacy compatibility commands keep their existing keys synchronized where necessary.

### Legacy account-scoped commands

`homey list` and `homey whoami` use the current context's authentication profile when it has one,
then fall back to profile `default`. An explicit `--auth-profile <name>` overrides that resolution.

`homey list --all-profiles` aggregates Homeys from every usable account profile and annotates each
result with its profile. The same Homey may appear more than once because different accounts may
have different roles or access.

### Environment-backed authentication profiles

`homey auth login <profile>` establishes either persistent OAuth authentication or, with
`--pat-env <variable>`, an environment-backed PAT profile. The CLI stores the variable name and
verifies its value when present, but never persists the value.

`auth logout` is not meaningful for an environment-owned secret and fails with guidance to unset
the variable or remove the profile. `auth migrate` applies only to persistent OAuth profiles.

### Selector failure

Context resolution stops at the first configured selection source. An invalid explicit `--context`
or `HOMEY_CONTEXT` fails and never falls through. A broken persisted current context offers guided
recovery in a TTY and fails outside a TTY.

### Multi-account client ownership

A profile-keyed registry creates and caches one `AthomCloudAPI` client per authentication profile
for the process lifetime. `HomeyAPI` clients belong to an immutable effective context or long-running
workflow and are explicitly disposed.

Operations across all profiles may use profile clients concurrently. Existing singleton callers use
a compatibility facade backed by authentication profile `default`; clients never swap credentials
in place.

### Existing operation safety

Contexts do not add confirmation prompts or change exit contracts for existing Homey API operations.
Context/auth management commands retain their own dependant warnings. Broader confirmation policy
for reboot, deletion, uninstall, and similar operations is outside this ADR.

### Authentication identity verification

An authentication profile records the canonical Athom account ID after successful verification.
Refreshing OAuth credentials or rotating an environment PAT must resolve to that same account.
Changing account identity fails unless the user supplies an explicit replacement option such as
`--replace-account`. Email and display-name changes for the same account ID update metadata normally.

### Target metadata refresh

Command execution uses current Homey name and platform metadata when account access is available,
but does not persist metadata as a side effect. Persisted metadata changes only through an explicit
refresh such as `context update --refresh` or `context diagnose --refresh`.

### Concurrent state mutation

A central state repository owns all versioned settings access. Mutations acquire a short-lived
interprocess lock, re-read state, apply migrations and changes, write a sibling temporary file, and
atomically rename it into place. Prompts and network calls occur before acquiring the mutation lock.

### Context/auth output contract

New context and authentication commands write requested data to stdout and warnings, diagnostics,
prompts, and errors to stderr. With `--json`, successful commands write exactly one JSON document to
stdout. Degraded-context warnings go to stderr. Credential values are always redacted.

Existing commands retain their current output contracts for backward compatibility.

## Proposed data model

The exact serialized property names may change during implementation, but the persisted domains and
relationships are settled:

```json
{
  "contextState": {
    "schemaVersion": 1,
    "current": "lab",
    "contexts": {
      "lab": {
        "description": "Office development Homey",
        "target": {
          "homeyId": "01234567-abcd-1234-abcd-0123456789ab",
          "name": "Development Homey",
          "platform": "local"
        },
        "authenticationProfile": "work",
        "homeyAuthentication": {
          "source": "environment",
          "variable": "HOMEY_TOKEN_LAB"
        },
        "route": {
          "type": "discovery",
          "strategies": ["localSecure", "local", "remoteForwarded", "cloud"]
        }
      },
      "recovery": {
        "target": {},
        "homeyAuthentication": {
          "source": "stored",
          "credentialId": "cred_8f42",
          "store": "settings"
        },
        "route": {
          "type": "address",
          "address": "http://10.0.0.1"
        }
      }
    }
  },
  "authenticationProfiles": {
    "schemaVersion": 1,
    "profiles": {
      "work": {
        "accountId": "account-123",
        "email": "developer@example.com",
        "credentialSource": {
          "type": "oauth",
          "credentialId": "cred_a17c",
          "store": "settings"
        }
      },
      "ci": {
        "accountId": "account-456",
        "credentialSource": {
          "type": "patEnvironment",
          "variable": "HOMEY_PAT_CI"
        }
      }
    }
  },
  "credentials": {
    "schemaVersion": 1,
    "entries": {}
  }
}
```

`credentials.entries` contains only secrets using the explicitly selected settings backend. Secrets
using the operating system credential store remain outside this file.

## Proposed command surface

```text
homey auth login <profile> [--pat-env <variable>] [--store settings|keychain]
homey auth ls|list
homey auth inspect <profile>
homey auth logout <profile>
homey auth rename <from> <to>
homey auth remove <profile> [--yes]
homey auth migrate <profile> --to settings|keychain

homey context create <name> [target/auth/route options] [--use] [--check]
homey context ls|list
homey context show
homey context inspect <name>
homey context use <name>
homey context update <name> [patch options]
homey context rename <from> <to>
homey context rm|remove <name> [--yes]
homey context diagnose <name> [--refresh]
```

Target-dependent commands accept global `--context <name>` and `--auth auto|homey|account`.
`HOMEY_CONTEXT` provides the environment override.

## Resolution summary

1. Resolve the first configured context selector: `--context`, `HOMEY_CONTEXT`, persisted current,
   then legacy selection. A broken higher-precedence selector never falls through.
2. Overlay explicit `--homey-id`, `--address`, and `--token` values and validate the resulting shape.
3. Determine operation scope from the API boundary (`AthomCloudAPI`, `HomeyAPI`, both, or neither).
4. Resolve `--auth`; `auto` prefers direct Homey authentication for Homey-scoped operations and
   account authentication for account-scoped operations. Authentication failures never trigger a
   different authentication method.
5. Resolve the route. Discovery passes its validated allow-list to `homey-api`; USB and configured
   addresses are exclusive endpoint overrides.
6. Produce one immutable effective context and retain it for the full command and cleanup lifetime.

## Implementation boundaries

The design requires these cohesive components rather than extending the current singleton directly:

- a versioned, atomic CLI state repository;
- settings and operating-system credential-store adapters;
- an authentication-profile registry with profile-scoped `AthomCloudAPI` clients;
- a context repository and health evaluator;
- one effective-context resolver shared by API and app commands;
- a compatibility facade for legacy login and selection state;
- root-global context/auth options and completion support.

## Rollout

1. Add versioned state, compatibility adapters, and profile-scoped client ownership without changing
   existing commands.
2. Add `auth` and `context` management commands with structured output.
3. Add global context resolution to API commands while preserving explicit target overlays.
4. Route app install/run and cleanup through the same immutable effective context.
5. Add diagnostics, all-profile listing, keychain opt-in, and explicit credential migration.

## Repository constraints

- Existing OAuth credentials and CLI settings are stored together in an unversioned JSON settings
  file; there is no credential-store abstraction.
- The authenticated API client is currently a singleton with one cached account, user, Homey list,
  and active Homey.
- `homey select current --json` has a tested exact output shape of `{ id, name, platform }`.
- API and app commands currently use different target-resolution and connection-fallback behavior.
- Long-running app cleanup can resolve the active Homey again; future context-aware sessions must
  retain their originally resolved target.

Supporting multiple accounts therefore requires an explicit authentication-profile model and a
redesign of account-scoped client caching. It cannot be implemented by adding an account field to
the existing singleton alone.

## Deferred implementation details

- Import/export and team-shared context references
- Confirmation policy for destructive Homey API operations
