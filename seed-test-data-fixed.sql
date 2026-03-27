-- ============================================================================
-- NandinCare Dashboard — Test Seed Data (FIXED)
-- ============================================================================
-- Run this manually in Supabase SQL Editor.
-- Assumes schema-v5.sql has already been applied (clinics, doctors, services exist).
-- Also assumes the pre-existing 'patients' table exists (from schema.sql).
-- ============================================================================

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
  -- Look up clinic
  SELECT id INTO v_clinic_id FROM clinics WHERE slug = 'nandin-zurkh';
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Clinic nandin-zurkh not found. Run schema-v5.sql first.';
  END IF;

  -- Look up doctors
  SELECT id INTO v_nergui_id FROM doctors WHERE slug = 'nergui' AND clinic_id = v_clinic_id;
  SELECT id INTO v_batundrakh_id FROM doctors WHERE slug = 'batundrakh' AND clinic_id = v_clinic_id;
  SELECT id INTO v_delgerkhishig_id FROM doctors WHERE slug = 'delgekhishig' AND clinic_id = v_clinic_id;

  IF v_nergui_id IS NULL THEN RAISE EXCEPTION 'Doctor nergui not found'; END IF;
  IF v_batundrakh_id IS NULL THEN RAISE EXCEPTION 'Doctor batundrakh not found'; END IF;
  IF v_delgerkhishig_id IS NULL THEN RAISE EXCEPTION 'Doctor delgekhishig not found'; END IF;

  -- Look up services
  SELECT id INTO v_svc_uzleg FROM services WHERE slug = 'emchiin-uzleg' AND clinic_id = v_clinic_id LIMIT 1;
  SELECT id INTO v_svc_ekho FROM services WHERE slug = 'zurhnii-ekho' AND clinic_id = v_clinic_id LIMIT 1;
  SELECT id INTO v_svc_kholter FROM services WHERE slug = 'kholter' AND clinic_id = v_clinic_id LIMIT 1;
  SELECT id INTO v_svc_kid_ekho FROM services WHERE slug = 'khuukhdiin-zurhnii-ekho' AND clinic_id = v_clinic_id LIMIT 1;

  -- ========================================================================
  -- PATIENTS (8 test patients)
  -- ========================================================================
  -- Note: patients table uses 'source' (not 'source_channel'), no 'lead_score',
  -- and status must be one of: active, blacklisted, churned, vip

  -- Patient 1: New lead from Facebook
  INSERT INTO patients (full_name, phone, status, source, primary_clinic)
  VALUES ('Болд Сүхбаатар', '99271801', 'active', 'facebook', v_clinic_id::text)
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO v_p1;
  IF v_p1 IS NULL THEN SELECT id INTO v_p1 FROM patients WHERE phone = '99271801'; END IF;

  -- Patient 2: Contacted via messenger
  INSERT INTO patients (full_name, phone, status, source, primary_clinic)
  VALUES ('Сараа Батболд', '88091234', 'active', 'messenger', v_clinic_id::text)
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO v_p2;
  IF v_p2 IS NULL THEN SELECT id INTO v_p2 FROM patients WHERE phone = '88091234'; END IF;

  -- Patient 3: Booked appointment
  INSERT INTO patients (full_name, phone, status, source, primary_clinic)
  VALUES ('Ганаа Дорж', '95553344', 'active', 'instagram', v_clinic_id::text)
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO v_p3;
  IF v_p3 IS NULL THEN SELECT id INTO v_p3 FROM patients WHERE phone = '95553344'; END IF;

  -- Patient 4: Confirmed (paid)
  INSERT INTO patients (full_name, phone, status, source, primary_clinic)
  VALUES ('Оюуна Түмэн', '99881122', 'active', 'phone', v_clinic_id::text)
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO v_p4;
  IF v_p4 IS NULL THEN SELECT id INTO v_p4 FROM patients WHERE phone = '99881122'; END IF;

  -- Patient 5: Showed up (returning patient)
  INSERT INTO patients (full_name, phone, status, source, primary_clinic, total_bookings, total_revenue)
  VALUES ('Энхжин Бат', '88007766', 'vip', 'facebook', v_clinic_id::text, 2, 115000)
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO v_p5;
  IF v_p5 IS NULL THEN SELECT id INTO v_p5 FROM patients WHERE phone = '88007766'; END IF;

  -- Patient 6: No-show (follow-up needed)
  INSERT INTO patients (full_name, phone, status, source, primary_clinic, total_bookings, total_no_shows)
  VALUES ('Тэмүүлэн Ган', '95001122', 'active', 'instagram', v_clinic_id::text, 1, 1)
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO v_p6;
  IF v_p6 IS NULL THEN SELECT id INTO v_p6 FROM patients WHERE phone = '95001122'; END IF;

  -- Patient 7: Retained patient
  INSERT INTO patients (full_name, phone, status, source, primary_clinic, total_bookings, total_revenue)
  VALUES ('Нараа Бадам', '99112233', 'vip', 'referral', v_clinic_id::text, 4, 280000)
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO v_p7;
  IF v_p7 IS NULL THEN SELECT id INTO v_p7 FROM patients WHERE phone = '99112233'; END IF;

  -- Patient 8: New lead, phone only
  INSERT INTO patients (full_name, phone, status, source, primary_clinic)
  VALUES ('Утасны lead', '88334455', 'active', 'viber', v_clinic_id::text)
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO v_p8;
  IF v_p8 IS NULL THEN SELECT id INTO v_p8 FROM patients WHERE phone = '88334455'; END IF;

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
  ON CONFLICT (booking_ref) DO NOTHING
  RETURNING id INTO v_b1;
  IF v_b1 IS NULL THEN SELECT id INTO v_b1 FROM bookings WHERE booking_ref = 'NC-' || to_char(now(), 'YYYYMMDD') || '-001'; END IF;

  -- Booking 2: Энхжин with Delgerkhishig today at 11:30
  INSERT INTO bookings (booking_ref, clinic_id, patient_id, doctor_id, service_id, scheduled_time, status, attendance)
  VALUES (
    'NC-' || to_char(now(), 'YYYYMMDD') || '-002',
    v_clinic_id, v_p5, v_delgerkhishig_id, v_svc_ekho,
    date_trunc('day', now() AT TIME ZONE 'Asia/Ulaanbaatar') + interval '11 hours 30 minutes',
    'confirmed', 'showed'
  )
  ON CONFLICT (booking_ref) DO NOTHING
  RETURNING id INTO v_b2;
  IF v_b2 IS NULL THEN SELECT id INTO v_b2 FROM bookings WHERE booking_ref = 'NC-' || to_char(now(), 'YYYYMMDD') || '-002'; END IF;

  -- Booking 3: Ганаа with Bat-Undrakh today at 14:00
  INSERT INTO bookings (booking_ref, clinic_id, patient_id, doctor_id, service_id, scheduled_time, status, attendance)
  VALUES (
    'NC-' || to_char(now(), 'YYYYMMDD') || '-003',
    v_clinic_id, v_p3, v_batundrakh_id, COALESCE(v_svc_kid_ekho, v_svc_uzleg),
    date_trunc('day', now() AT TIME ZONE 'Asia/Ulaanbaatar') + interval '14 hours',
    'booked', 'pending'
  )
  ON CONFLICT (booking_ref) DO NOTHING
  RETURNING id INTO v_b3;
  IF v_b3 IS NULL THEN SELECT id INTO v_b3 FROM bookings WHERE booking_ref = 'NC-' || to_char(now(), 'YYYYMMDD') || '-003'; END IF;

  -- ========================================================================
  -- PAYMENTS (for the confirmed bookings)
  -- ========================================================================

  INSERT INTO payments (booking_id, patient_id, clinic_id, deposit_amount, amount_paid, status, verified_by, paid_at)
  VALUES
    (v_b1, v_p4, v_clinic_id, 20000, 20000, 'confirmed', 'qpay_webhook', now() - interval '2 hours'),
    (v_b2, v_p5, v_clinic_id, 20000, 20000, 'confirmed', 'gmail_trigger', now() - interval '1 day')
  ON CONFLICT DO NOTHING;

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
