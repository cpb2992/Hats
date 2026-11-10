-- Date nights and the kitchen (what's already in the house) are shared too.
alter table public.household_items drop constraint if exists household_items_kind_check;
alter table public.household_items add constraint household_items_kind_check
  check (kind in ('grocery', 'pantry', 'dinner', 'event', 'task', 'date'));
