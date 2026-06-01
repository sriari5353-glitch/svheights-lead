UPDATE auth.users
SET encrypted_password = crypt('MOna321', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE lower(email) = lower('sriari5353@gmail.com');