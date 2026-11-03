---
title: QuestBoard backend, built to scale
updated: 2026-11-03
status: design, not built. Expands section 9 of the v1 spec.
---

# Backend built to scale

## Where it stands

There is no backend yet. Each install keeps an append-only event ledger in IndexedDB, and every balance, streak and badge is computed from those events on the device. That is the right shape for scale. The server's job stays small: store events, hand them to the family's other devices, and own the things a device must not decide alone (accounts, purchases, deletion).

## Why this design scales

1. **Writes are tiny and append-only.** A chore check is one row of about 300 bytes. Nothing is updated in place, so there are no lock fights, and retries are safe because every event has a unique ULID `id` (`insert ... on conflict do nothing`).
2. **Every row belongs to one family.** `family_id` is the partition key for security, indexes, caching and, later, sharding. No query ever reaches across families.
3. **The server does no money math.** Derivation already lives in the tested client engine (`app/src/engine`). The server never computes a balance, so a busy payday Sunday costs inserts, not recomputation.
4. **Sync uses a server sequence number, not timestamps.** Device clocks drift. Each inserted row gets a `seq` from the database; a device pulls "everything for my family after seq N". Order for money stays the event's own `at` plus `id`, exactly as on the device today (`sortEvents` in `app/src/storage/adapter.ts`).

## Stack

| Piece | Choice | Why |
|---|---|---|
| Database, auth, realtime | Supabase (Postgres with row-level security) | One managed service; Sign in with Apple, Google and email built in; Realtime pushes new events to the kitchen tablet |
| Purchases | RevenueCat webhooks into a Supabase Edge Function | The server owns entitlements; devices only read them |
| Photos | Supabase Storage, private bucket per family, signed URLs | Kid photos never public |
| Front end | Static build on Cloudflare Pages or Vercel, plus the Capacitor apps | GitHub Pages is fine until custom domains and headers matter |
| Errors | First-party or a kids-safe crash reporter | Apple Kids rules forbid third-party analytics if listed in Kids |

## Draft schema

```sql
create table families (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  doc jsonb not null              -- the Family record the app already has (kids, chores, settings)
);

create table members (
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'parent', 'caregiver')),
  primary key (family_id, user_id)
);

create table events (
  family_id uuid not null references families(id) on delete cascade,
  id text not null,               -- ULID made on the device
  seq bigint generated always as identity,
  at timestamptz not null,        -- when it happened, from the device
  received_at timestamptz not null default now(),
  device_id text not null,
  body jsonb not null,            -- the QBEvent exactly as the app stores it; cents stay integers
  primary key (family_id, id)
);
create index events_pull on events (family_id, seq);

create table entitlements (
  family_id uuid not null references families(id) on delete cascade,
  key text not null,              -- 'pro', 'buddy.dragon', 'pack.space', 'profile.extra'
  source text not null,           -- 'app_store', 'play', 'web', 'grant'
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (family_id, key)
);

alter table families enable row level security;
alter table members enable row level security;
alter table events enable row level security;
alter table entitlements enable row level security;

create function is_member(f uuid) returns boolean language sql stable security definer as $$
  select exists (select 1 from members where family_id = f and user_id = auth.uid())
$$;

create policy read_events on events for select using (is_member(family_id));
create policy add_events on events for insert with check (is_member(family_id));
-- No update or delete policy on events: the ledger is append-only. Undo is an event.
create policy read_entitlements on entitlements for select using (is_member(family_id));
-- Entitlements are written only by the RevenueCat webhook with the service key.
```

## Sync protocol

- **Push:** the device batches unsent events (up to 500) into one insert. Conflicts on `(family_id, id)` are ignored, so a resend after a dropped connection is harmless.
- **Pull:** `select body, seq from events where family_id = $1 and seq > $2 order by seq limit 1000`, repeated until empty. The device stores the last `seq`.
- **Live:** a Realtime subscription on the family's events wakes other devices, which then pull. Realtime is a nudge, never the source of truth, so a missed message costs nothing.
- **Offline:** unchanged from today. The device keeps working on IndexedDB and pushes when it is back online.
- **Week close race:** two devices can both close the same week. The device already uses one close per kid and week (build ledger ruling). On the server, a unique index on the close event's `(family_id, kid, week)` rejects the second one, and that device drops its copy on the next pull.
- **Code boundary:** a `SupabaseAdapter` implements the existing `StorageAdapter` interface (`app/src/storage/adapter.ts`), wrapping `LocalAdapter` as its offline cache. Nothing in the engine or UI changes.

## Capacity math

Assumptions: two kids per family, about 30 events per family per day, about 300 bytes per event with indexes, and a peak hour at three times the average.

| Families | Events per day | Average writes per second | Peak writes per second | New data per year |
|---|---|---|---|---|
| 1,000 | 30k | 0.3 | 1 | 3 GB |
| 50,000 | 1.5M | 17 | 52 | 160 GB |
| 500,000 | 15M | 174 | 520 | 1.6 TB |
| 5,000,000 | 150M | 1,740 | 5,200 | 16 TB |

A single well-sized Postgres handles thousands of small batched inserts per second, so writes are not the limit until the millions. Storage is the thing to manage, and the ledger makes that easy:

- **Week snapshots.** When a week closes, the device writes a snapshot event with the closing state. A new device loads the latest snapshot plus newer events instead of the full history.
- **Archive.** Events older than 13 months move to object storage (Parquet by month), kept for export and support, out of the hot table.
- **Partitioning.** Past about 50k families, partition `events` by month (`pg_partman`) so archiving is dropping a partition rather than a mass delete.

## Stages

| Stage | Families | Setup | Rough cost per month |
|---|---|---|---|
| Launch | up to 10k | Supabase Pro, one small compute instance, daily backups, point-in-time recovery | about $25 to $60 |
| Growth | 10k to 200k | Bigger compute, connection pooling (Supavisor), monthly partitions, archive job, a read replica for support and reporting | low hundreds |
| Scale | 200k to 5M | Supabase Team or Enterprise, or self-managed Postgres behind the same API; a second region for read latency; a queue for webhooks and archive jobs; families sharded by `family_id` if one primary is not enough | thousands, against revenue far above that at a few percent Pro conversion |

## What to measure before launch

- A load test (k6) that replays the demo family's week as 10k simulated families pushing and pulling, against a staging project. Pass mark: 95% of pushes under 300 ms, no failed inserts, Realtime nudges under 2 s.
- Row-level security tests: a parent of family A can never read, insert into or see the count of family B's events.
- A restore drill: restore last night's backup into a scratch project and check one family's balances match on a device.

## Rules that keep scale cheap

- Money is integer cents in `body`, never floats, never recomputed on the server.
- The server never edits an event. Corrections are new events, as in the app today.
- Every query starts with `family_id`.
- Entitlements come from the server only. The device's own grant remains for the free web build and tests.
- Account deletion deletes the family row and cascades, then removes the family's storage folder and archive files. App Store rules require this to be reachable inside the app.
