alter table app_private.demo_sessions
  add column otp_issued_at timestamptz;

-- Existing OTP rows already satisfy the former created_at-relative five-minute
-- constraint. Preserve their encrypted value, clamp only to the session
-- boundary, and derive an issuance timestamp that satisfies the new invariant.
update app_private.demo_sessions
set otp_expires_at = least(otp_expires_at, expires_at)
where otp_ciphertext is not null
  and otp_expires_at is not null;

update app_private.demo_sessions
set otp_issued_at = least(created_at, otp_expires_at - interval '1 microsecond')
where otp_ciphertext is not null
  and otp_expires_at is not null;

alter table app_private.demo_sessions
  drop constraint demo_sessions_otp_lifetime;

alter table app_private.demo_sessions
  add constraint demo_sessions_otp_lifetime check (
    (otp_ciphertext is null and otp_issued_at is null and otp_expires_at is null)
    or (
      otp_ciphertext is not null
      and otp_issued_at is not null
      and otp_expires_at is not null
      and otp_issued_at < otp_expires_at
      and otp_expires_at <= otp_issued_at + interval '5 minutes'
      and otp_expires_at <= expires_at
    )
  ) not valid;

alter table app_private.demo_sessions
  validate constraint demo_sessions_otp_lifetime;
