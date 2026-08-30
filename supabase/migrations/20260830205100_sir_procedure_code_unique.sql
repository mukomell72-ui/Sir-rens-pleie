drop index if exists public.procedures_code_uq;
create unique index procedures_code_uq on public.procedures(code);
