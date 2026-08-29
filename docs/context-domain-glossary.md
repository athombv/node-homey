# Homey CLI context domain glossary

This glossary records the domain language accepted by ADR 0001 for the Homey CLI context system.

## Account

An Athom identity that can authenticate with Homey Cloud and has access to one or more Homeys. An
account is not a context because one account may be used by many contexts.

## Authentication profile

A named, locally stored reference to the credentials and token state for one account. A context
references an authentication profile; it does not contain account credentials directly.

Authentication profiles are user-global and may be referenced by any number of contexts. Persistent
credentials use the user's selected settings or operating-system credential-store backend.

The profile's shell-safe name is its CLI identity. A successfully authenticated profile also records
the canonical Athom account ID as verified metadata. Profiles may use persistent OAuth state or read
a PAT from a named environment variable. Resolving different credentials to another account ID
requires explicit account replacement.

## Context

A named target connection used by the CLI. It combines a Homey target, a connection policy, and
zero or one authentication profile. It may also reference direct Homey authentication.

A context has a user-global unique name. Multiple contexts may target the same Homey. A context does
not contain project/build settings or output-format preferences.

## Current context

The one user-global persisted context used when a command does not specify an explicit context.
An explicit `--context` takes precedence, followed by `HOMEY_CONTEXT`, the persisted current context,
and finally migrated legacy selection state.

## Effective context

The immutable command-scoped snapshot produced by resolving the selected context, explicit overlays,
credential references, connection configuration, and operation requirements. It is resolved once
and remains stable for the entire command and its cleanup handlers.

## Connection policy

The rule used to reach a target Homey, including its allowed discovery strategies. It
uses the existing `homey-api` strategy vocabulary. USB is always opt-in and is never included in
automatic/default connection selection.

The `homey-api` discovery strategies are `mdns`, `cloud`, `local`, `localSecure`, and
`remoteForwarded`. USB and a configured direct address are endpoint overrides, not discovery
strategies.

A discovery route allows one or more raw strategies. The collection describes allowed routes and
delegates preference entirely to `homey-api`.

The library treats the collection as an allow-list, not a caller-ordered list. Its fixed routing
logic may race cloud with other enabled routes after `localSecure` fails; contexts accept that
behaviour and do not impose a separate priority algorithm.

The default allow-list contains `localSecure`, `local`, `remoteForwarded`, and `cloud`. It excludes
`mdns` and every endpoint override. Unknown strategy names are invalid; known but currently unusable
strategies may be stored and reported through context health. The concrete allow-list is persisted
so future CLI defaults do not change an existing context implicitly.

## Endpoint override

An explicit route that replaces the base URL produced by discovery. USB and a configured direct
address are endpoint overrides. They are exclusive and have no automatic fallback. USB is always
opt-in.

## Credential

Secret material used to authenticate an account or a direct Homey API connection. Credentials must
not be embedded directly in context records.

## Credential source

The mechanism through which an authentication profile obtains credentials. Supported source kinds
are persistent OAuth state and a PAT read from a named environment variable.

Persistent OAuth credentials may use the operating system credential store or the existing local
settings file. The CLI has a global default with per-credential overrides. Existing file-backed
credentials remain file-backed unless the user explicitly requests migration; changing the default
does not migrate existing secrets.

## Account authentication

Authentication that establishes an Athom account identity and can perform account-scoped operations,
including resolving Homeys available to that account. It is supplied by an authentication profile.

## Direct Homey authentication

Authentication against a particular Homey API endpoint using a Homey token. It does not establish
an Athom account identity and cannot perform account-scoped operations.

When a context has both account and direct Homey authentication, direct Homey authentication takes
precedence for Homey-scoped operations. Authentication failures do not cause an automatic fallback
to account authentication.

The context contains an opaque credential reference or environment-variable name, never the raw
token as part of the context record.

## Identifier

The user-facing, shell-safe key for an authentication profile or context. Identifiers are user-global,
between 1 and 64 characters, and match `^[a-z0-9][a-z0-9._-]{0,63}$`.

## Legacy selection

The Homey stored today under `activeHomey` and managed through `homey select`, `homey select current`,
and `homey unselect`. These commands remain supported as compatibility views over contexts.

## Target

The Homey a command will operate on, identified canonically by Homey ID. A display name and platform
may be cached as metadata but do not define target identity. Execution may use fresh metadata without
persisting it; stored metadata changes only through an explicit refresh.

## Account-scoped operation

An operation performed through `AthomCloudAPI` against Athom account or cloud-account resources
rather than a particular Homey. It requires account authentication.

## Homey-scoped operation

An operation performed through `HomeyAPI` against a particular Homey. It may use direct Homey
authentication or account-mediated Homey authentication.

## Local operation

An operation that uses neither `AthomCloudAPI` nor `HomeyAPI` and requires no authentication.

## Broken context

A stored context whose referenced authentication profile, credential, or other required object is
missing. Broken contexts remain inspectable but cannot perform operations requiring the missing
capability.

## Context health

The capability-aware usability of a context. A context is `ready` when all configured references are
usable, `degraded` when an unused configured capability is broken, and `unusable` for an operation
whose required capability cannot resolve.
