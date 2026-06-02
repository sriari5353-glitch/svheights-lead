
-- Ensure admin role and reset password for sriari5353@gmail.com; rename profile away from SV HEIGHTS
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower('sriari5353@gmail.com') LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User sriari5353@gmail.com not found';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt('ADobe321', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = uid;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
  SET username = 'MONA',
      full_name = 'MONA',
      brand_name = 'MONA',
      is_active = true,
      updated_at = now()
  WHERE id = uid;
END $$;
