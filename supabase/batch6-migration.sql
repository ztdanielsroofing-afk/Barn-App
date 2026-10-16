-- ============================================================================
-- Free Rein — Batch 6 migration: documents to e-sign
-- Owner-defined documents (waivers/contracts) that families must sign, plus a
-- record of each signature (typed or drawn). Run once in Supabase → SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- Documents the barn wants signed (owner/staff create these).
create table if not exists public.barn_documents (
  id         uuid primary key default gen_random_uuid(),
  barn_id    uuid references public.barns(id) on delete cascade,
  title      text not null,
  body       text,                         -- the terms / waiver text
  required   boolean not null default true,-- must be signed before entering the app
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per family-signature of a document.
create table if not exists public.signatures (
  id             uuid primary key default gen_random_uuid(),
  barn_id        uuid references public.barns(id) on delete cascade,
  document_id    uuid references public.barn_documents(id) on delete cascade,
  family_id      uuid references public.families(id) on delete cascade,
  signer_name    text,
  method         text,                     -- 'typed' | 'drawn'
  signature_data text,                     -- typed full name, or a drawn-signature image (data URL)
  signed_at      timestamptz not null default now()
);
create index if not exists signatures_family_idx on public.signatures (family_id);
create index if not exists signatures_doc_idx on public.signatures (document_id);

-- ---------------- RLS ----------------
alter table public.barn_documents enable row level security;
alter table public.signatures     enable row level security;

-- barn_documents: staff manage everything; clients can read active docs to sign.
drop policy if exists bdoc_staff on public.barn_documents;
create policy bdoc_staff on public.barn_documents for all
  using (barn_id = public.my_barn_id() and public.is_staff())
  with check (barn_id = public.my_barn_id() and public.is_staff());
drop policy if exists bdoc_client_read on public.barn_documents;
create policy bdoc_client_read on public.barn_documents for select
  using (barn_id = public.my_barn_id() and active);

-- signatures: staff see all in barn; clients insert + read their own family's.
drop policy if exists sig_staff_read on public.signatures;
create policy sig_staff_read on public.signatures for select
  using (barn_id = public.my_barn_id() and public.is_staff());
drop policy if exists sig_client_read on public.signatures;
create policy sig_client_read on public.signatures for select
  using (barn_id = public.my_barn_id() and family_id = public.my_family_id());
drop policy if exists sig_client_insert on public.signatures;
create policy sig_client_insert on public.signatures for insert
  with check (barn_id = public.my_barn_id() and family_id = public.my_family_id());
