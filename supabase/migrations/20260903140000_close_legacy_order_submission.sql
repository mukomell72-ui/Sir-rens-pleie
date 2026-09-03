-- The legacy function is still used internally by public_submit_order_v2,
-- but must not be callable directly because it has no consent or rate limit.
revoke execute on function public.public_submit_order(jsonb) from public, anon, authenticated;

-- Only the validated, consent-aware public endpoint remains exposed.
revoke execute on function public.public_submit_order_v2(jsonb) from public, authenticated;
grant execute on function public.public_submit_order_v2(jsonb) to anon;
