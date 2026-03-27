-- ============================================================================
-- NandinCare Dashboard — Test Seed Data
-- ============================================================================
-- Run this manually in Supabase SQL Editor.
-- Assumes schema-v5.sql has already been applied (clinics, doctors, services exist).
-- Also assumes the pre-existing 'patients' table exists.
-- ============================================================================

-- Get reference IDs
DO $$
DECLARE
  v_clinic_id UUID;
  v_nergui_id UUID;
  v_batundrakh_id UUID;
  v_delgerkhishig_id UUID;
  v_svc_uzleg UUID;
  v_svc_ekho UUID;
  v_svc_kholter UUID;
  v_svc_kid_ekho UUID;
  v_p1 UUID; v_p2 UUID; v_p3 UUID; v_p4 UUID; v_p5 UUID;
  v_p6 UUID; v_p7 UUID; v_p8 UUID;
  v_b1 UUID; v_b2 UUID; v_b3 UUID;
BEGIN
  SELECT id INTO v_clinic_id FROM clinics WHERE slug = 'nandin-zurkh';
  SELECT id INTO v_nergui_id FROM doctors WHERE slug = 'nergui' AND clinic_id = v_clinic_id;
  SELECT id INTO v_batundrakh_id FROM doctors WHERE slug = 'batundrakh' AND clinic_id = v_clinic_id;
  SELECT id INTO v_delgerkhishig_id FROM doctors WHERE slug = 'delgekhishig' AND clinic_id = v_clinic_id;
  SELECT id INTO v_svc_uzleg FROM services WHERE slug = 'emchiin-uzleg' AND clinic_id = v_clinic_id LIMIT 1;
  SELECT id INTO v_svc_ekho FROM services WHERE slug = 'zurhnii-ekho' AND clinic_id = v_clinic_id LIMIT 1;
  SELECT id INTO v_svc_kholter FROM services WHERE slug = 'kholter' AND clinic_id = v_clinic_id LIMIT 1;
  SELECT id INTO v_svc_kid_ekho FROM services WHERE slug = 'khuukhdiin-zurhnii-ekho' AND clinic_id = v_clinic_id LIMIT 1;

  -- ========================================================================
  -- PATIENTS (8 test patients across pipeline stages)
  -- ========================================================================

  -- Patient 1: New lead from Facebook
  INSERT INTO patients (full_name, phone, status, source_channel, lead_score, primary_clinic)
  VALUES ('Болд Сүхбаатар', '99271801', 'new', 'facebook', 45, v_clinic_id::text)
  RETURNING id INTO v_p1;

  -- Patient 2: Contacted via messenger
  INSERT INTO patients (full_name, phone, status, source_channel, lead_score, primary_clinic)
  VALUES ('Сараа Батболд', '88091234', 'contacted', 'messenger', 62, v_clinic_id::text)
  RETURNING id INTO v_p2;

  -- Patient 3: Booked appointment
  INSERT INTO patients (full_name, phone, status, source_channel, lead_score, primary_clinic)
  VALUES ('Ганаа Дорж', '95553344', 'booked', 'instagram', 78, v_clinic_id::text)
  RETURNING id INTO v_p3;

  -- Patient 4: Confirmed (paid)
  INSERT INTO patients (full_name, phone, status, source_channel, lead_score, primary_clinic)
  VALUES ('Оюуна Түмэн', '99881122', 'confirmed', 'phone', 85, v_clinic_id::text)
  RETURNING id INTO v_p4;

  -- Patient 5: Showed up
  INSERT INTO patients (full_name, phone, status, source_channel, lead_score, primary_clinic, total_bookings, total_revenue)
  VALUES ('Энхжин Бат', '88007766', 'showed', 'facebook', 90, v_clinic_id::text, 2, 115000)
  RETURNING id INTO v_p5;

  -- Patient 6: No-show (follow-up needed)
  INSERT INTO patients (full_name, phone, status, source_channel, lead_score, primary_clinic, total_bookings)
  VALUES ('Тэмүүлэн Ган', '95001122', 'no_show', 'instagram', 30, v_clinic_id::text, 1)
  RETURNING id INTO v_p6;

  -- Patient 7: Retained patient
  INSERT INTO patients (full_name, phone, status, source_channel, lead_score, primary_clinic, total_bookings, total_revenue)
  VALUES ('Нараа Бадам', '99112233', 'retained', 'referral', 95, v_clinic_id::text, 4, 280000)
  RETURNING id INTO v_p7;

  -- Patient 8: New lead, phone only
  INSERT INTO patients (phone, status, source_channel, lead_score, primary_clinic)
  VALUES ('88334455', 'new', 'viber', 15, v_clinic_id::text)
  RETURNING id INTO v_p8;

  -- ========================================================================
  -- BOOKINGS (3 bookings for today so TodaySchedule shows data)
  -- ========================================================================

  -- Booking 1: Оюуна with Nergui today at 10:00
  INSERT INTO bookings (booking_ref, clinic_id, patient_id, doctor_id, service_id, scheduled_time, status, attendance)
  VALUES (
    'NC-' || to_char(now(), 'YYYYMMDD') || '-001',
    v_clinic_id, v_p4, v_nergui_id, v_svc_uzleg,
    date_trunc('day', now() AT TIME ZONE 'Asia/Ulaanbaatar') + interval '10 hours',
    'confirmed', 'pending'
  )
  RETURNING id INTO v_b1;

  -- Booking 2: Энхжин with Delgerkhishig today at 11:30
  INSERT INTO bookings (booking_ref, clinic_id, patient_id, doctor_id, service_id, scheduled_time, status, attendance)
  VALUES (
    'NC-' || to_char(now(), 'YYYYMMDD') || '-002',
    v_clinic_id, v_p5, v_delgerkhishig_id, v_svc_ekho,
    date_trunc('day', now() AT TIME ZONE 'Asia/Ulaanbaatar') + interval '11 hours 30 minutes',
    'confirmed', 'showed'
  )
  RETURNING id INTO v_b2;

  -- Booking 3: Ганаа with Bat-Undrakh today at 14:00
  INSERT INTO bookings (booking_ref, clinic_id, patient_id, doctor_id, service_id, scheduled_time, status, attendance)
  VALUES (
    'NC-' || to_char(now(), 'YYYYMMDD') || '-003',
    v_clinic_id, v_p3, v_batundrakh_id, COALESCE(v_svc_kid_ekho, v_svc_uzleg),
    date_trunc('day', now() AT TIME ZONE 'Asia/Ulaanbaatar') + interval '14 hours',
    'booked', 'pending'
  )
  RETURNING id INTO v_b3;

  -- ========================================================================
  -- PAYMENTS (for the confirmed bookings)
  -- ========================================================================

  INSERT INTO payments (booking_id, patient_id, clinic_id, deposit_amount, amount_paid, status, verified_by, paid_at)
  VALUES
    (v_b1, v_p4, v_clinic_id, 20000, 20000, 'confirmed', 'qpay_webhook', now() - interval '2 hours'),
    (v_b2, v_p5, v_clinic_id, 20000, 20000, 'confirmed', 'gmail_trigger', now() - interval '1 day');

  -- ========================================================================
  -- FOLLOW-UPS (pending ones for stats)
  -- ========================================================================

  INSERT INTO follow_ups (patient_id, doctor_id, sequence_type, step_number, channel, message_content, scheduled_send_at, status)
  VALUES
    (v_p6, v_nergui_id, 'no_show', 1, 'sms', 'Тэмүүлэн, та өнөөдөр ирсэнгүй. Дахин цаг авах боломжтой.', now(), 'pending'),
    (v_p2, v_nergui_id, 'phone_collection', 1, 'messenger', 'Сараа, цаг захиалахын тулд утасны дугаараа илгээнэ үү.', now() + interval '1 hour', 'pending');

  -- ========================================================================
  -- NOTIFICATIONS (for AlertsFeed)
  -- ========================================================================

  INSERT INTO notifications (patient_id, booking_id, type, channel, content, status, sent_at, created_at)
  VALUES
    (v_p4, v_b1, 'payment_confirmation', 'sms', 'Оюуна: Төлбөр баталгаажлаа, 10:00 цагт ирнэ үү', 'sent', now() - interval '2 hours', now() - interval '2 hours'),
    (v_p5, v_b2, 'reminder_24h', 'sms', 'Энхжин: Маргааш 11:30-д Др. Дэлгэрхишиг эмчид цаг байна', 'sent', now() - interval '1 day', now() - interval '1 day'),
    (v_p3, v_b3, 'booking_confirmation', 'sms', 'Ганаа: 14:00-д Бат-Ундрах эмчид цаг захиалагдлаа', 'sent', now() - interval '30 minutes', now() - interval '30 minutes'),
    (v_p6, NULL, 'no_show_alert', 'sms', 'Тэмүүлэн: Өнөөдрийн цагтаа ирсэнгүй — 1/3 анхааруулга', 'sent', now() - interval '3 hours', now() - interval '3 hours'),
    (v_p1, NULL, 'general', 'messenger', 'Болд: Facebook зараас орж ирсэн шинэ lead', 'delivered', now() - interval '5 hours', now() - interval '5 hours');

  RAISE NOTICE 'Seed data inserted: 8 patients, 3 bookings, 2 payments, 2 follow-ups, 5 notifications';
END $$;
