UPDATE public.profiles
SET username = 'MONA', full_name = 'MONA', brand_name = 'MONA', is_active = true
WHERE id = 'aa1f6eb4-13dc-428e-8837-9de34ac04118';

INSERT INTO public.user_roles (user_id, role)
VALUES ('aa1f6eb4-13dc-428e-8837-9de34ac04118', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id <> 'aa1f6eb4-13dc-428e-8837-9de34ac04118';