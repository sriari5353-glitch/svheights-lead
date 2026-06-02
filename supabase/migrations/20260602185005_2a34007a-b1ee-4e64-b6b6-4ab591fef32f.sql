-- Ensure sriari5353@gmail.com has admin role and set password to ADobe321
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower('sriari5353@gmail.com') LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User sriari5353@gmail.com not found in auth.users';
  ELSE
    -- Reset password
    UPDATE auth.users
    SET encrypted_password = crypt('ADobe321', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;

    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure profile active
    UPDATE public.profiles SET is_active = true WHERE id = v_user_id;
  END IF;
END $$;