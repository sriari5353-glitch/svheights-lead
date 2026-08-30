-- Rename the admin profile so the MONA name can be a regular user
update public.profiles set username = 'ADMIN' where id = 'aa1f6eb4-13dc-428e-8837-9de34ac04118';

-- Ensure admin password / confirmation stays as requested
update auth.users
set encrypted_password = crypt('ADobe321', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
where id = 'aa1f6eb4-13dc-428e-8837-9de34ac04118';

-- Create MONA as a regular user
do $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = 'mona@leadmate.app';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'mona@leadmate.app', crypt('MOna7799', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username','MONA'), now(), now()
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', 'mona@leadmate.app', 'email_verified', true),
      'email', now(), now(), now());
  else
    update auth.users set encrypted_password = crypt('MOna7799', gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()) where id = v_id;
  end if;

  update public.profiles set username = 'MONA', is_active = true where id = v_id;
  delete from public.user_roles where user_id = v_id and role = 'admin';
  insert into public.user_roles (user_id, role) values (v_id, 'user') on conflict do nothing;
end $$;