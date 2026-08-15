-- =====================================================================
-- Yulia School — Tam veritabanı şeması
-- =====================================================================
-- Boş bir Supabase projesinde SQL Editor'de baştan sona çalıştırıldığında
-- uygulamanın ihtiyaç duyduğu her şeyi kurar:
--   tablolar, kısıtlar, indeksler, fonksiyonlar, trigger'lar, RLS politikaları.
--
-- VERİ İÇERMEZ — sadece yapı. Yeni kurulum sıfır kayıtla başlar.
--
-- Kurulumdan sonra yapılması gerekenler:
--   1) Authentication > Users bölümünden yönetici kullanıcısı oluştur
--   2) Uygulamanın .env dosyasına proje URL'i ve anon key'i yaz
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EKLENTİLER
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 2. TABLOLAR
-- ---------------------------------------------------------------------

-- Öğrenci kayıtları. Güncel paket durumu bu satırda tutulur; ilk kayıt
-- bilgileri initial_* kolonlarına trigger ile yazılır.
CREATE TABLE public.registrations (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  registration_code text DEFAULT ('REG-'::text || substr(md5((random())::text), 1, 8)),
  student_id uuid DEFAULT uuid_generate_v4(),
  student_name text NOT NULL,
  student_age text NOT NULL,
  parent_id uuid DEFAULT uuid_generate_v4(),
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  package_id uuid DEFAULT uuid_generate_v4(),
  package_type text NOT NULL,
  package_start_date timestamp with time zone NOT NULL,
  package_end_date timestamp with time zone NOT NULL,
  payment_id uuid DEFAULT uuid_generate_v4(),
  payment_status text NOT NULL,
  payment_method text NOT NULL,
  payment_amount numeric NOT NULL,
  payment_date timestamp with time zone DEFAULT now(),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  extension_count integer DEFAULT 0,
  last_extension_date timestamp with time zone,
  initial_package_type text,
  initial_start_date timestamp with time zone,
  initial_end_date timestamp with time zone,
  initial_payment_method text,
  initial_payment_amount numeric,
  initial_notes text,
  CONSTRAINT registrations_pkey PRIMARY KEY (id),
  CONSTRAINT registrations_registration_code_key UNIQUE (registration_code),
  CONSTRAINT unique_parent_phone UNIQUE (parent_phone),
  -- 'ucretsiz' = ücretsiz katılım: ödeme alınmaz, ders kotası yoktur
  CONSTRAINT valid_package_type CHECK (package_type = ANY (ARRAY['tek-seferlik'::text, 'hafta-1'::text, 'hafta-2'::text, 'hafta-3'::text, 'hafta-4'::text, 'ucretsiz'::text])),
  CONSTRAINT valid_payment_status CHECK (payment_status = ANY (ARRAY['odendi'::text, 'beklemede'::text, 'ucretsiz'::text])),
  CONSTRAINT valid_payment_method CHECK (payment_method = ANY (ARRAY['banka'::text, 'nakit'::text, 'kart'::text, 'belirlenmedi'::text]))
);

-- Dersler / etkinlikler
CREATE TABLE public.events (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  event_code text DEFAULT ('EVT-'::text || substr(md5((random())::text), 1, 8)),
  event_date timestamp with time zone NOT NULL,
  age_group text NOT NULL,
  event_type text NOT NULL,
  custom_description text,
  max_capacity integer DEFAULT 10 NOT NULL,
  current_capacity integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_event_code_key UNIQUE (event_code),
  CONSTRAINT valid_age_group CHECK (age_group = ANY (ARRAY['12-18 Aylık'::text, '18-24 Aylık'::text, '24-36 Aylık'::text, '3+ Yaş'::text, '4+ Yaş'::text, '5+ Yaş'::text])),
  CONSTRAINT valid_event_type CHECK (event_type = ANY (ARRAY['ingilizce'::text, 'duyusal'::text, 'ozel'::text])),
  CONSTRAINT valid_capacity CHECK (current_capacity <= max_capacity)
);

-- Öğrenci ↔ ders bağı. Her satır aynı zamanda paket kullanım defteridir:
-- status 'attended' veya 'no_show' ise bir ders hakkı harcanmış sayılır.
CREATE TABLE public.event_participants (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  event_id uuid,
  registration_id uuid,
  status text DEFAULT 'scheduled'::text NOT NULL,
  cancellation_reason text,
  cancellation_date timestamp with time zone,
  is_makeup boolean DEFAULT false,
  makeup_for_id uuid,
  makeup_notes text,
  postponed_to_id uuid,
  postponed_from_id uuid,
  postponed_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_participants_pkey PRIMARY KEY (id),
  CONSTRAINT unique_event_participant UNIQUE (event_id, registration_id),
  CONSTRAINT valid_status CHECK (status = ANY (ARRAY['scheduled'::text, 'attended'::text, 'no_show'::text, 'cancelled'::text, 'makeup'::text, 'postponed'::text]))
);

-- Paket uzatma geçmişi
CREATE TABLE public.extension_history (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  registration_id uuid,
  previous_end_date timestamp with time zone NOT NULL,
  new_end_date timestamp with time zone NOT NULL,
  extension_date timestamp with time zone DEFAULT now(),
  previous_package_type text NOT NULL,
  new_package_type text NOT NULL,
  payment_status text NOT NULL,
  payment_method text NOT NULL,
  payment_amount numeric,
  payment_date timestamp with time zone DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  new_start_date timestamp with time zone,
  CONSTRAINT extension_history_pkey PRIMARY KEY (id),
  -- Bilinçli olarak 'ucretsiz' İÇERMEZ: ücretsiz katılıma uzatma yapılamaz,
  -- yanlışlıkla denenirse veritabanı hata verir (emniyet kemeri).
  CONSTRAINT valid_extension_package_type CHECK (new_package_type = ANY (ARRAY['tek-seferlik'::text, 'hafta-1'::text, 'hafta-2'::text, 'hafta-3'::text, 'hafta-4'::text])),
  CONSTRAINT valid_extension_payment_status CHECK (payment_status = ANY (ARRAY['odendi'::text, 'beklemede'::text])),
  CONSTRAINT valid_extension_payment_method CHECK (payment_method = ANY (ARRAY['banka'::text, 'nakit'::text, 'kart'::text, 'belirlenmedi'::text]))
);

-- Gelir kayıtları (ilk ödeme + uzatma ödemeleri)
CREATE TABLE public.financial_records (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  registration_id uuid,
  transaction_type text NOT NULL,
  transaction_date timestamp with time zone DEFAULT now(),
  payment_status text NOT NULL,
  payment_method text NOT NULL,
  amount numeric NOT NULL,
  payment_date timestamp with time zone DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  extension_history_id uuid,
  CONSTRAINT financial_records_pkey PRIMARY KEY (id),
  CONSTRAINT valid_transaction_type CHECK (transaction_type = ANY (ARRAY['initial_payment'::text, 'extension_payment'::text])),
  -- Bilinçli olarak 'ucretsiz' İÇERMEZ: ücretsiz katılım için ödeme satırı oluşmaz
  CONSTRAINT valid_financial_payment_status CHECK (payment_status = ANY (ARRAY['odendi'::text, 'beklemede'::text])),
  CONSTRAINT valid_financial_payment_method CHECK (payment_method = ANY (ARRAY['banka'::text, 'nakit'::text, 'kart'::text, 'belirlenmedi'::text]))
);

-- Giderler
CREATE TABLE public.expenses (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  expense_type text NOT NULL,
  amount numeric NOT NULL,
  description text,
  notes text,
  expense_date timestamp with time zone DEFAULT now(),
  payment_method text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT valid_expense_type CHECK (expense_type = ANY (ARRAY['kira'::text, 'elektrik'::text, 'su'::text, 'dogalgaz'::text, 'internet'::text, 'maas'::text, 'malzeme'::text, 'mutfak'::text, 'reklam'::text, 'filament'::text, 'diger'::text])),
  CONSTRAINT valid_payment_method CHECK (payment_method = ANY (ARRAY['banka'::text, 'nakit'::text, 'kart'::text]))
);

-- Bekleme listesi
CREATE TABLE public.waitlist (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  student_name text NOT NULL,
  student_age text NOT NULL,
  package_type text NOT NULL,
  contact_date date DEFAULT now() NOT NULL,
  status text DEFAULT 'beklemede'::text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT waitlist_pkey PRIMARY KEY (id),
  CONSTRAINT waitlist_package_type_check CHECK (package_type = ANY (ARRAY['belirsiz'::text, 'tek-seferlik'::text, 'hafta-1'::text, 'hafta-2'::text, 'hafta-3'::text, 'hafta-4'::text])),
  CONSTRAINT waitlist_status_check CHECK (status = ANY (ARRAY['beklemede'::text, 'iletisime-gecildi'::text]))
);

-- Notlar
CREATE TABLE public.notes (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  title text NOT NULL,
  content text,
  is_favorite boolean DEFAULT false,
  color text DEFAULT '#ffffff'::text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notes_pkey PRIMARY KEY (id)
);

-- Haftalık konular. week_start her zaman bir PAZARTESİ olmalıdır.
CREATE TABLE public.weekly_themes (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  week_start date NOT NULL,
  theme text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT weekly_themes_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_themes_week_start_key UNIQUE (week_start),
  CONSTRAINT weekly_themes_week_start_check CHECK (EXTRACT(isodow FROM week_start) = (1)::numeric)
);

-- ---------------------------------------------------------------------
-- 3. YABANCI ANAHTARLAR
-- ---------------------------------------------------------------------
-- NOT: event_participants.registration_id için orijinal şemada yabancı anahtar
-- YOKTUR. Aynen korundu; eklemek istersen bu satırı aç:
--   ALTER TABLE public.event_participants ADD CONSTRAINT event_participants_registration_id_fkey
--     FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;

ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  ADD CONSTRAINT event_participants_makeup_for_id_fkey FOREIGN KEY (makeup_for_id) REFERENCES public.event_participants(id),
  ADD CONSTRAINT event_participants_postponed_from_id_fkey FOREIGN KEY (postponed_from_id) REFERENCES public.event_participants(id),
  ADD CONSTRAINT event_participants_postponed_to_id_fkey FOREIGN KEY (postponed_to_id) REFERENCES public.event_participants(id);

ALTER TABLE public.extension_history
  ADD CONSTRAINT extension_history_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;

ALTER TABLE public.financial_records
  ADD CONSTRAINT financial_records_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE,
  ADD CONSTRAINT financial_records_extension_history_id_fkey FOREIGN KEY (extension_history_id) REFERENCES public.extension_history(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 4. İNDEKSLER
-- ---------------------------------------------------------------------
CREATE INDEX idx_event_participants_event_id ON public.event_participants USING btree (event_id);
CREATE INDEX idx_event_participants_registration_id ON public.event_participants USING btree (registration_id);
CREATE INDEX idx_event_participants_status ON public.event_participants USING btree (status);
CREATE INDEX idx_event_participants_is_makeup ON public.event_participants USING btree (is_makeup);
CREATE INDEX idx_event_participants_makeup_for_id ON public.event_participants USING btree (makeup_for_id);
CREATE INDEX idx_event_participants_postponed_from_id ON public.event_participants USING btree (postponed_from_id);
CREATE INDEX idx_event_participants_postponed_to_id ON public.event_participants USING btree (postponed_to_id);

CREATE INDEX idx_events_event_date ON public.events USING btree (event_date);
CREATE INDEX idx_events_age_group ON public.events USING btree (age_group);
CREATE INDEX idx_events_event_type ON public.events USING btree (event_type);
CREATE INDEX idx_events_is_active ON public.events USING btree (is_active);

CREATE INDEX idx_registrations_created_at ON public.registrations USING btree (created_at);
CREATE INDEX idx_registrations_is_active ON public.registrations USING btree (is_active);
CREATE INDEX idx_registrations_parent_phone ON public.registrations USING btree (parent_phone);
CREATE INDEX idx_registrations_payment_date ON public.registrations USING btree (payment_date);
CREATE INDEX idx_registrations_payment_status ON public.registrations USING btree (payment_status);
CREATE INDEX idx_registrations_student_name ON public.registrations USING btree (student_name);

CREATE INDEX idx_extension_history_registration_id ON public.extension_history USING btree (registration_id);
CREATE INDEX idx_extension_history_created_at ON public.extension_history USING btree (created_at);
CREATE INDEX idx_extension_history_extension_date ON public.extension_history USING btree (extension_date);
CREATE INDEX idx_extension_history_new_package_type ON public.extension_history USING btree (new_package_type);
CREATE INDEX idx_extension_history_new_start_date ON public.extension_history USING btree (new_start_date);
CREATE INDEX idx_extension_history_payment_date ON public.extension_history USING btree (payment_date);

CREATE INDEX idx_financial_records_registration_id ON public.financial_records USING btree (registration_id);
CREATE INDEX idx_financial_records_extension_history_id ON public.financial_records USING btree (extension_history_id);
CREATE INDEX idx_financial_records_created_at ON public.financial_records USING btree (created_at);
CREATE INDEX idx_financial_records_payment_date ON public.financial_records USING btree (payment_date);
CREATE INDEX idx_financial_records_payment_status ON public.financial_records USING btree (payment_status);
CREATE INDEX idx_financial_records_transaction_date ON public.financial_records USING btree (transaction_date);
CREATE INDEX idx_financial_records_transaction_type ON public.financial_records USING btree (transaction_type);

-- ---------------------------------------------------------------------
-- 5. FONKSİYONLAR
-- ---------------------------------------------------------------------

-- Genel updated_at güncelleyicileri
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_event_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_participant_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_weekly_themes_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Derse katılımcı eklenince/silinince kontenjan sayacını günceller.
-- DİKKAT: status güncellemelerinde ÇALIŞMAZ (yalnızca INSERT/DELETE).
-- SECURITY DEFINER ZORUNLU: bu trigger event_participants üzerinden events
-- tablosunu günceller. Rol tabanlı RLS altında kullanıcının o dersi güncelleme
-- hakkı yoksa UPDATE sessizce 0 satır etkiler — hata vermez, sayaç bozulur.
CREATE OR REPLACE FUNCTION public.update_event_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events
        SET current_capacity = current_capacity + 1
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events
        SET current_capacity = current_capacity - 1
        WHERE id = OLD.event_id;
    END IF;
    RETURN NULL;
END;
$function$;

-- Yeni kayıtta ilk paket/ödeme bilgilerini initial_* kolonlarına kopyalar
CREATE OR REPLACE FUNCTION public.save_initial_registration_data()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
begin
    if new.extension_count = 0 then
        new.initial_package_type = new.package_type;
        new.initial_start_date = new.package_start_date;
        new.initial_end_date = new.package_end_date;
        new.initial_payment_method = new.payment_method;
        new.initial_payment_amount = new.payment_amount;
        new.initial_notes = new.notes;
    end if;
    return new;
end;
$function$;

-- Son uzatmayı geri alır: kaydı uzatma öncesi haline döndürür, ilgili
-- finansal kaydı siler. Uygulama bunu RPC olarak çağırır.
CREATE OR REPLACE FUNCTION public.delete_last_extension(p_extension_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ext extension_history%ROWTYPE;
  v_prev extension_history%ROWTYPE;
  v_reg registrations%ROWTYPE;
  v_latest_id uuid;
BEGIN
  -- SECURITY DEFINER olduğu için RLS baypas edilir; yetki kontrolü burada
  -- olmak zorunda. Aksi halde öğretmen bu RPC ile sahibin uzatmalarını geri alır.
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Only the owner can delete an extension' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_ext FROM extension_history WHERE id = p_extension_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Extension not found: %', p_extension_id;
  END IF;

  SELECT id INTO v_latest_id
  FROM extension_history
  WHERE registration_id = v_ext.registration_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_latest_id <> p_extension_id THEN
    RAISE EXCEPTION 'Only the latest extension can be deleted';
  END IF;

  SELECT * INTO v_reg FROM registrations WHERE id = v_ext.registration_id FOR UPDATE;

  SELECT * INTO v_prev
  FROM extension_history
  WHERE registration_id = v_ext.registration_id AND id <> p_extension_id
  ORDER BY created_at DESC
  LIMIT 1;

  DELETE FROM financial_records WHERE extension_history_id = p_extension_id;
  DELETE FROM extension_history WHERE id = p_extension_id;

  IF v_prev.id IS NOT NULL THEN
    UPDATE registrations SET
      package_end_date    = v_ext.previous_end_date,
      package_type        = v_ext.previous_package_type,
      package_start_date  = COALESCE(v_prev.new_start_date, v_reg.package_start_date),
      extension_count     = GREATEST(COALESCE(v_reg.extension_count, 0) - 1, 0),
      last_extension_date = v_prev.created_at,
      payment_status      = v_prev.payment_status,
      payment_method      = v_prev.payment_method,
      payment_amount      = COALESCE(v_prev.payment_amount, v_reg.payment_amount),
      payment_date        = v_prev.payment_date,
      notes               = v_prev.notes
    WHERE id = v_ext.registration_id;
  ELSE
    UPDATE registrations SET
      package_end_date    = v_ext.previous_end_date,
      package_type        = v_ext.previous_package_type,
      package_start_date  = COALESCE(v_reg.initial_start_date, v_reg.package_start_date),
      extension_count     = 0,
      last_extension_date = NULL,
      payment_status      = 'odendi',
      payment_method      = COALESCE(v_reg.initial_payment_method, v_reg.payment_method, 'belirlenmedi'),
      payment_amount      = COALESCE(v_reg.initial_payment_amount, v_reg.payment_amount, 0),
      payment_date        = v_reg.payment_date,
      notes               = v_reg.initial_notes
    WHERE id = v_ext.registration_id;
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------
-- 6. TRIGGER'LAR
-- ---------------------------------------------------------------------
CREATE TRIGGER update_event_capacity
  AFTER INSERT OR DELETE ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION update_event_capacity();

CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION update_participant_updated_at();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_event_updated_at();

CREATE TRIGGER save_initial_registration_data
  BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION save_initial_registration_data();

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER weekly_themes_set_updated_at
  BEFORE UPDATE ON public.weekly_themes
  FOR EACH ROW EXECUTE FUNCTION set_weekly_themes_updated_at();

-- ---------------------------------------------------------------------
-- 7. ROL KATMANI
-- ---------------------------------------------------------------------
-- İki rol var: 'owner' (okul sahibi) ve 'teacher' (öğretmen).
-- Öğretmen finansal veriyi ve sahibin derslerini GÖREMEZ. Bu ayrım burada,
-- veritabanında kurulur — arayüzde menü gizlemek koruma değildir, çünkü anon
-- anahtar tarayıcıya inen paketin içindedir ve herkes doğrudan API'ye istek
-- atabilir.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  role text DEFAULT 'teacher'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Varsayılan 'teacher': yapılandırması unutulan hesap en dar yetkiyle açılır
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['owner'::text, 'teacher'::text]))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Yeni kullanıcı açılınca profil satırı kendiliğinden oluşsun
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sahiplik kolonları.
-- DİKKAT: events.teacher_id'nin DEFAULT auth.uid() olması YENİ ders için doğru,
-- KOPYALAMA için yanlıştır. Kopyalarken sahiplik kaynak dersten taşınmalı,
-- yoksa sahibin kopyaladığı ders öğretmenin takviminden düşer.
ALTER TABLE public.events
  ADD COLUMN teacher_id uuid NOT NULL DEFAULT auth.uid()
  REFERENCES auth.users(id) ON DELETE RESTRICT;

-- NULL = henüz bir öğretmene atanmamış (yalnızca sahip görür)
ALTER TABLE public.registrations
  ADD COLUMN teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_events_teacher_id ON public.events USING btree (teacher_id);
CREATE INDEX idx_registrations_teacher_id ON public.registrations USING btree (teacher_id);

-- SECURITY DEFINER ZORUNLU: aksi halde profiles üzerindeki RLS'i tetikler ve
-- politikalar bu fonksiyonu çağırdığı için sonsuz döngü oluşur.
-- profiles tablosuna ASLA FORCE ROW LEVEL SECURITY uygulanmamalı — o durumda
-- RLS tablo sahibine de uygulanır ve döngü geri gelir.
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
  )
$function$;

-- Politika içindeki EXISTS alt sorgusuna da RLS uygulanır. Öğretmenin
-- registrations tablosuna SELECT hakkı olmadığı için "bu öğrenci bana atanmış mı"
-- kontrolü politika içinde doğrudan yazılamaz — bu yardımcıya taşındı.
CREATE OR REPLACE FUNCTION public.is_my_student(p_registration_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE id = p_registration_id AND teacher_id = auth.uid()
  )
$function$;

-- Ders hakkı sayımı. Bu bir DOĞRULUK düzeltmesidir:
-- İstemcide sayım yapılsaydı, öğrencinin BAŞKA öğretmenin dersinde yaktığı haklar
-- öğretmenin sorgusuna hiç gelmez ve kalan ders olduğundan fazla görünürdü.
-- Kurallar src/lib/lessonUsage.js ile AYNI olmalı: kullanılan = attended + no_show,
-- sayım package_start_date ve sonrasından, ücretsizde kota yok.
CREATE OR REPLACE FUNCTION public.get_lesson_usage(p_registration_ids uuid[])
RETURNS TABLE (
  registration_id uuid, is_free boolean, total integer, used integer,
  remaining integer, attended integer, no_show integer, makeup integer,
  scheduled integer, postponed integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_is_owner boolean := public.is_owner();
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    (r.package_type = 'ucretsiz') AS is_free,
    CASE WHEN r.package_type = 'ucretsiz' THEN NULL::integer ELSE t.total END,
    c.used,
    CASE WHEN r.package_type = 'ucretsiz' THEN NULL::integer
         ELSE GREATEST(t.total - c.used, 0) END,
    c.attended, c.no_show, c.makeup, c.scheduled, c.postponed
  FROM public.registrations r
  CROSS JOIN LATERAL (
    SELECT CASE r.package_type
      WHEN 'hafta-1' THEN 4 WHEN 'hafta-2' THEN 8 WHEN 'hafta-3' THEN 12
      WHEN 'hafta-4' THEN 16 WHEN 'tek-seferlik' THEN 1 ELSE 0
    END AS total
  ) t
  CROSS JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE ep.status = 'attended')::integer AS attended,
      COUNT(*) FILTER (WHERE ep.status = 'no_show')::integer AS no_show,
      COUNT(*) FILTER (WHERE ep.status = 'makeup')::integer AS makeup,
      COUNT(*) FILTER (WHERE ep.status = 'scheduled')::integer AS scheduled,
      COUNT(*) FILTER (WHERE ep.status = 'postponed')::integer AS postponed,
      COUNT(*) FILTER (WHERE ep.status IN ('attended', 'no_show'))::integer AS used
    FROM public.event_participants ep
    JOIN public.events e ON e.id = ep.event_id
    WHERE ep.registration_id = r.id
      AND (r.package_type = 'ucretsiz' OR r.package_start_date IS NULL
           OR e.event_date >= r.package_start_date)
  ) c
  -- Kapsam BURADA daraltılır: yabancı bir kaydın kimliği gönderilse bile
  -- satır dönmez, yani bu fonksiyon bir yoklama bilgi kaynağına dönüşmez.
  WHERE r.id = ANY (p_registration_ids)
    AND (v_is_owner OR r.teacher_id = auth.uid());
END;
$function$;

-- ---------------------------------------------------------------------
-- 8. GÖRÜNÜMLER
-- ---------------------------------------------------------------------
-- RLS satır bazlıdır, KOLON gizleyemez. Sahip de öğretmen de aynı
-- 'authenticated' rolüdür, dolayısıyla kolon bazlı REVOKE de işe yaramaz
-- (sahipten de alırdı). Kolon maskelemenin tek yolu görünümdür.
--
-- security_invoker KAPALI (varsayılan): görünüm postgres rolüyle çalışır,
-- o rolde BYPASSRLS açıktır, yani taban tablonun RLS'i devreye girmez ve
-- görünümün WHERE şartı TEK koruma katmanı olur. Bu yüzden şart hatasız
-- yazılmalıdır. auth.uid() görünümün içinde yine ÇAĞIRANIN kimliğini döner.
CREATE VIEW public.my_students AS
SELECT
  r.id, r.student_name, r.student_age, r.package_type,
  r.package_start_date, r.package_end_date, r.is_active, r.teacher_id,
  -- Veli adı sahibe açık, öğretmene NULL: seçicilerde tek kod yolu kalsın diye
  -- kolon tamamen atılmadı, maskelendi.
  CASE WHEN (SELECT public.is_owner()) THEN r.parent_name END AS parent_name
FROM public.registrations r
WHERE (SELECT public.is_owner()) OR r.teacher_id = auth.uid();

-- Herkese açık takvim bu iki görünümden beslenir. Taban tablolarda anon
-- politikası YOKTUR: aksi halde çıkış yapmış bir öğretmen (ya da isteğinden
-- Authorization başlığını atan biri) tüm dersleri ve katılımcı satırlarını
-- okuyabilir, rol ayrımı tamamen baypas edilirdi.
CREATE VIEW public.public_events AS
SELECT id, event_code, event_date, age_group, event_type, custom_description,
       max_capacity, current_capacity, is_active, created_at, updated_at
FROM public.events
WHERE is_active;   -- teacher_id DIŞARIDA: kimin dersi olduğu herkese açık bilgi değil

-- Yalnızca sayı döner; registration_id dışarı çıkmaz.
CREATE VIEW public.public_event_capacity AS
SELECT ep.event_id,
       count(*) FILTER (
         WHERE ep.status = ANY (ARRAY['scheduled'::text, 'makeup'::text, 'attended'::text])
       )::integer AS active_capacity
FROM public.event_participants ep
GROUP BY ep.event_id;

-- ---------------------------------------------------------------------
-- 9. RLS POLİTİKALARI
-- ---------------------------------------------------------------------
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_themes ENABLE ROW LEVEL SECURITY;

-- is_owner() çağrıları (SELECT ...) biçiminde skaler alt sorgu olarak yazıldı:
-- Postgres bunu InitPlan'e çevirip sorgu başına BİR KEZ çalıştırır. Düz çağrı
-- satır başına bir kez çalışırdı.

-- profiles: herkes kendi satırını okur (rolünü öğrenmek için), sahip hepsini yönetir.
-- Öğretmene INSERT/UPDATE politikası verilmez — kendi rolünü 'owner' yapamaz.
CREATE POLICY profiles_select_self_or_owner ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR (SELECT public.is_owner()));
CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_owner()));
CREATE POLICY profiles_update_owner ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));
CREATE POLICY profiles_delete_owner ON public.profiles
  FOR DELETE TO authenticated USING ((SELECT public.is_owner()));

-- Yalnızca sahip: finansal veri, idari listeler ve öğrenci kayıtları.
-- registrations ödeme ve veli bilgisi içerdiği için taban tablo öğretmene
-- tamamen kapalıdır; öğretmen my_students görünümünü okur.
CREATE POLICY registrations_owner_only ON public.registrations
  FOR ALL TO authenticated
  USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));
CREATE POLICY financial_records_owner_only ON public.financial_records
  FOR ALL TO authenticated
  USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));
CREATE POLICY extension_history_owner_only ON public.extension_history
  FOR ALL TO authenticated
  USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));
CREATE POLICY expenses_owner_only ON public.expenses
  FOR ALL TO authenticated
  USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));
CREATE POLICY waitlist_owner_only ON public.waitlist
  FOR ALL TO authenticated
  USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));
CREATE POLICY notes_owner_only ON public.notes
  FOR ALL TO authenticated
  USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));

-- Dersler: sahip hepsini, öğretmen kendininkini
CREATE POLICY events_staff_rw ON public.events
  FOR ALL TO authenticated
  USING ((SELECT public.is_owner()) OR teacher_id = auth.uid())
  WITH CHECK ((SELECT public.is_owner()) OR teacher_id = auth.uid());

-- Katılımcılar: ders benim olmalı; eklerken AYRICA öğrenci bana atanmış olmalı.
-- Güncelleme kısıtında öğrenci şartı yoktur — yoklama alabilmesi için gerekli.
CREATE POLICY participants_staff_read ON public.event_participants
  FOR SELECT TO authenticated
  USING ((SELECT public.is_owner())
         OR EXISTS (SELECT 1 FROM public.events e
                    WHERE e.id = event_id AND e.teacher_id = auth.uid()));
CREATE POLICY participants_staff_write ON public.event_participants
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_owner())
              OR (EXISTS (SELECT 1 FROM public.events e
                          WHERE e.id = event_id AND e.teacher_id = auth.uid())
                  AND public.is_my_student(registration_id)));
CREATE POLICY participants_staff_update ON public.event_participants
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_owner())
         OR EXISTS (SELECT 1 FROM public.events e
                    WHERE e.id = event_id AND e.teacher_id = auth.uid()))
  WITH CHECK ((SELECT public.is_owner())
              OR EXISTS (SELECT 1 FROM public.events e
                         WHERE e.id = event_id AND e.teacher_id = auth.uid()));
CREATE POLICY participants_staff_delete ON public.event_participants
  FOR DELETE TO authenticated
  USING ((SELECT public.is_owner())
         OR EXISTS (SELECT 1 FROM public.events e
                    WHERE e.id = event_id AND e.teacher_id = auth.uid()));

-- Haftanın konusu: öğretmen görür, değiştiremez. Herkese açık takvim de okur.
CREATE POLICY weekly_themes_public_read ON public.weekly_themes
  FOR SELECT TO anon USING (true);
CREATE POLICY weekly_themes_staff_read ON public.weekly_themes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY weekly_themes_owner_write ON public.weekly_themes
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_owner()));
CREATE POLICY weekly_themes_owner_update ON public.weekly_themes
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));
CREATE POLICY weekly_themes_owner_delete ON public.weekly_themes
  FOR DELETE TO authenticated USING ((SELECT public.is_owner()));

-- ---------------------------------------------------------------------
-- 10. YETKİLER
-- ---------------------------------------------------------------------
-- Postgres fonksiyonlara varsayılan olarak PUBLIC üzerinden EXECUTE verir;
-- yalnızca anon'dan almak yetmez, önce PUBLIC mirası kaldırılmalıdır.
REVOKE EXECUTE ON FUNCTION public.delete_last_extension(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_last_extension(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.delete_last_extension(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_last_extension(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_owner() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_owner() TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_my_student(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_my_student(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_my_student(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_lesson_usage(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_lesson_usage(uuid[]) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_lesson_usage(uuid[]) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_lesson_usage(uuid[]) TO service_role;

REVOKE ALL ON public.my_students FROM PUBLIC;
REVOKE ALL ON public.my_students FROM anon;
GRANT SELECT ON public.my_students TO authenticated;

GRANT SELECT ON public.public_events TO anon, authenticated;
GRANT SELECT ON public.public_event_capacity TO anon, authenticated;

-- ---------------------------------------------------------------------
-- KURULUM SONRASI
-- ---------------------------------------------------------------------
-- Yönetici hesabını Authentication > Users bölümünden oluşturduktan sonra
-- rolünü 'owner' yapmayı UNUTMAYIN — trigger her yeni kullanıcıyı 'teacher'
-- olarak açar ve öğretmen hiçbir yönetim ekranını göremez:
--
--   UPDATE public.profiles SET role = 'owner', full_name = 'Yulia'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'ADRES');

-- Trigger fonksiyonlarının RPC olarak çağrılabilmesine gerek yok; trigger zaten
-- tablo bağlamında çalışır. EXECUTE açık kalırsa /rest/v1/rpc/... üzerinden
-- dışarıdan çağrılabilir hale gelirler (Supabase güvenlik denetçisi de uyarır).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_event_capacity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_event_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_participant_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_weekly_themes_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_initial_registration_data() FROM PUBLIC, anon, authenticated;
