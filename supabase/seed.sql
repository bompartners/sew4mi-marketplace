-- Sew4Mi Database Seed Data - Simplified Version
-- Only seeds data for tables that exist in core migrations

-- First, insert into auth.users (Supabase Auth table)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@sew4mi.com', crypt('admin123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{}', FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adwoa@example.com', crypt('password123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{}', FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'yaw@example.com', crypt('password123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{}', FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'akosua@example.com', crypt('password123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{}', FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kwame@example.com', crypt('password123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{}', FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ama@example.com', crypt('password123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{}', FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer1@example.com', crypt('password123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{}', FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer2@example.com', crypt('password123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{}', FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL)
ON CONFLICT (id) DO NOTHING;

-- Then insert users into public.users table
INSERT INTO public.users (id, email, phone_number, phone_verified, full_name, role, gender, whatsapp_opted_in, whatsapp_number, created_at, updated_at)
VALUES
  -- Admin
  ('10000000-0000-0000-0000-000000000001', 'admin@sew4mi.com', '+233241234567', true, 'Admin User', 'ADMIN', 'prefer_not_to_say', false, NULL, NOW(), NOW()),

  -- Tailors
  ('20000000-0000-0000-0000-000000000001', 'adwoa@example.com', '+233244567890', true, 'Adwoa Mensah', 'TAILOR', 'female', true, '+233244567890', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000002', 'yaw@example.com', '+233245678901', true, 'Yaw Boateng', 'TAILOR', 'male', true, '+233245678901', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000003', 'akosua@example.com', '+233246789012', true, 'Akosua Frimpong', 'TAILOR', 'female', true, '+233246789012', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000004', 'kwame@example.com', '+233247890123', true, 'Kwame Asante', 'TAILOR', 'male', true, '+233247890123', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000005', 'ama@example.com', '+233248901234', true, 'Ama Darko', 'TAILOR', 'female', true, '+233248901234', NOW(), NOW()),

  -- Customers
  ('30000000-0000-0000-0000-000000000001', 'customer1@example.com', '+233251234567', true, 'Kofi Owusu', 'CUSTOMER', 'male', true, '+233251234567', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000002', 'customer2@example.com', '+233252345678', true, 'Abena Osei', 'CUSTOMER', 'female', true, '+233252345678', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert tailor profiles
INSERT INTO public.tailor_profiles (
  id,
  user_id,
  business_name,
  bio,
  years_of_experience,
  specializations,
  location,
  location_name,
  city,
  region,
  delivery_radius_km,
  verification_status,
  verification_date,
  verified_by,
  rating,
  total_reviews,
  total_orders,
  completion_rate,
  response_time_hours,
  pricing_tiers,
  working_hours,
  accepts_rush_orders,
  rush_order_fee_percentage,
  instagram_handle,
  created_at,
  updated_at
)
VALUES
  -- Adwoa's Atelier (Wedding specialist)
  (
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Adwoa''s Atelier',
    'Award-winning bridal and formal wear specialist with 12+ years of experience. Known for exquisite beadwork and custom wedding gowns. Every piece is crafted with love and attention to detail.',
    12,
    ARRAY['Wedding Dresses', 'Evening Gowns', 'Bridal Accessories', 'Custom Embroidery'],
    ST_SetSRID(ST_MakePoint(-0.1516, 5.6445), 4326), -- East Legon coordinates
    'East Legon',
    'Accra',
    'Greater Accra',
    15.00,
    'VERIFIED',
    NOW() - INTERVAL '6 months',
    '10000000-0000-0000-0000-000000000001',
    4.9,
    156,
    189,
    98.50,
    1.5,
    '{"basic": {"price_min": 200, "price_max": 400}, "premium": {"price_min": 400, "price_max": 800}, "luxury": {"price_min": 800, "price_max": 2000}}'::jsonb,
    '{"monday": {"open": "09:00", "close": "18:00"}, "tuesday": {"open": "09:00", "close": "18:00"}, "wednesday": {"open": "09:00", "close": "18:00"}, "thursday": {"open": "09:00", "close": "18:00"}, "friday": {"open": "09:00", "close": "18:00"}, "saturday": {"open": "10:00", "close": "16:00"}}'::jsonb,
    true,
    25.00,
    '@adwoas_atelier',
    NOW() - INTERVAL '2 years',
    NOW()
  ),

  -- Yaw's Traditional Wear (Kente specialist)
  (
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'Yaw''s Traditional Wear',
    'Master craftsman specializing in authentic Ghanaian traditional wear. Expert in kente weaving, dashiki, and kaftan designs. Preserving our heritage one stitch at a time.',
    15,
    ARRAY['Kente', 'Dashiki', 'Kaftan', 'Traditional Smocks', 'Adinkra Prints'],
    ST_SetSRID(ST_MakePoint(-0.1863, 5.5558), 4326), -- Osu coordinates
    'Osu',
    'Accra',
    'Greater Accra',
    20.00,
    'VERIFIED',
    NOW() - INTERVAL '1 year',
    '10000000-0000-0000-0000-000000000001',
    4.8,
    203,
    245,
    97.80,
    0.8,
    '{"basic": {"price_min": 150, "price_max": 300}, "premium": {"price_min": 300, "price_max": 500}, "luxury": {"price_min": 500, "price_max": 1200}}'::jsonb,
    '{"monday": {"open": "08:00", "close": "19:00"}, "tuesday": {"open": "08:00", "close": "19:00"}, "wednesday": {"open": "08:00", "close": "19:00"}, "thursday": {"open": "08:00", "close": "19:00"}, "friday": {"open": "08:00", "close": "19:00"}, "saturday": {"open": "09:00", "close": "17:00"}, "sunday": {"open": "12:00", "close": "16:00"}}'::jsonb,
    true,
    20.00,
    '@yaws_traditional',
    NOW() - INTERVAL '3 years',
    NOW()
  ),

  -- Akosua's Fashion (Contemporary designs)
  (
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    'Akosua''s Fashion',
    'Contemporary African fashion with a modern twist. Specializing in office wear, casual chic, and fusion designs that blend Ghanaian prints with international trends.',
    8,
    ARRAY['Contemporary Designs', 'Office Wear', 'Casual Wear', 'Ankara Fusion'],
    ST_SetSRID(ST_MakePoint(-0.0163, 5.6698), 4326), -- Tema coordinates
    'Tema Community 1',
    'Tema',
    'Greater Accra',
    25.00,
    'VERIFIED',
    NOW() - INTERVAL '8 months',
    '10000000-0000-0000-0000-000000000001',
    4.7,
    89,
    112,
    95.50,
    2.5,
    '{"basic": {"price_min": 180, "price_max": 350}, "premium": {"price_min": 350, "price_max": 600}, "luxury": {"price_min": 600, "price_max": 1000}}'::jsonb,
    '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "friday": {"open": "09:00", "close": "17:00"}, "saturday": {"open": "10:00", "close": "14:00"}}'::jsonb,
    true,
    30.00,
    '@akosuas_fashion',
    NOW() - INTERVAL '18 months',
    NOW()
  ),

  -- Kwame's Gentleman's Corner (Men's tailoring)
  (
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000004',
    'Kwame''s Gentleman''s Corner',
    'Expert men''s tailor with focus on suits, corporate wear, and traditional men''s fashion. Precision cuts and perfect fits guaranteed.',
    10,
    ARRAY['Men''s Suits', 'Corporate Wear', 'Casual Men''s Wear', 'Traditional Men''s Clothing'],
    ST_SetSRID(ST_MakePoint(-0.2470, 5.5724), 4326), -- Dansoman coordinates
    'Dansoman',
    'Accra',
    'Greater Accra',
    18.00,
    'VERIFIED',
    NOW() - INTERVAL '10 months',
    '10000000-0000-0000-0000-000000000001',
    4.6,
    67,
    84,
    94.00,
    3.0,
    '{"basic": {"price_min": 200, "price_max": 400}, "premium": {"price_min": 400, "price_max": 700}, "luxury": {"price_min": 700, "price_max": 1500}}'::jsonb,
    '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "18:00"}, "saturday": {"open": "09:00", "close": "15:00"}}'::jsonb,
    false,
    0.00,
    '@kwames_corner',
    NOW() - INTERVAL '2 years',
    NOW()
  ),

  -- Ama's Kids Fashion (Children's wear)
  (
    '40000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000005',
    'Ama''s Kids Fashion',
    'Adorable and comfortable children''s wear specialist. From christening gowns to school uniforms, party dresses to everyday wear. Safe, quality fabrics for your little ones.',
    6,
    ARRAY['Children''s Wear', 'Christening Gowns', 'School Uniforms', 'Party Dresses'],
    ST_SetSRID(ST_MakePoint(-0.1307, 5.6147), 4326), -- Madina coordinates
    'Madina',
    'Accra',
    'Greater Accra',
    12.00,
    'VERIFIED',
    NOW() - INTERVAL '5 months',
    '10000000-0000-0000-0000-000000000001',
    4.8,
    124,
    158,
    96.20,
    2.0,
    '{"basic": {"price_min": 80, "price_max": 150}, "premium": {"price_min": 150, "price_max": 300}, "luxury": {"price_min": 300, "price_max": 600}}'::jsonb,
    '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "friday": {"open": "09:00", "close": "17:00"}, "saturday": {"open": "10:00", "close": "16:00"}}'::jsonb,
    true,
    25.00,
    '@amas_kids',
    NOW() - INTERVAL '1 year',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Seed data successfully inserted!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test Accounts:';
  RAISE NOTICE '- Admin: admin@sew4mi.com';
  RAISE NOTICE '- Tailors: adwoa@example.com, yaw@example.com, akosua@example.com, kwame@example.com, ama@example.com';
  RAISE NOTICE '- Customers: customer1@example.com, customer2@example.com';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Create user accounts via Supabase Auth before logging in';
  RAISE NOTICE '========================================';
END $$;
