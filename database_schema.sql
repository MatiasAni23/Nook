-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL,
  email character varying NOT NULL UNIQUE CHECK (POSITION(('@'::text) IN (email)) > 1),
  name character varying,
  phone character varying,
  role character varying NOT NULL DEFAULT 'student'::character varying CHECK (role::text = ANY (ARRAY['student'::character varying, 'worker'::character varying, 'admin'::character varying, 'support'::character varying, 'delegate'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'verified'::character varying, 'suspended'::character varying, 'blocked'::character varying, 'pending'::character varying]::text[])),
  profile_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login timestamp with time zone,
  avatar_url text,
  email_verified boolean NOT NULL DEFAULT false,
  phone_verified boolean NOT NULL DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  university character varying,
  career character varying,
  subjects ARRAY,
  company character varying,
  position character varying,
  is_independent boolean NOT NULL DEFAULT false,
  industry character varying,
  bio text,
  profile_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  institution_id uuid,
  city_id uuid,
  region_id uuid,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_profiles_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT user_profiles_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id),
  CONSTRAINT user_profiles_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id)
);
CREATE TABLE public.delegates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'suspended'::character varying, 'pending'::character varying]::text[])),
  joined_date timestamp with time zone NOT NULL DEFAULT now(),
  last_active timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT delegates_pkey PRIMARY KEY (id),
  CONSTRAINT delegates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.places (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['library'::character varying, 'cafe'::character varying, 'coworking'::character varying, 'office'::character varying, 'meeting_room'::character varying, 'private_office'::character varying, 'park'::character varying]::text[])),
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['study'::character varying, 'work'::character varying]::text[])),
  plan_type character varying NOT NULL DEFAULT 'basic'::character varying CHECK (plan_type::text = ANY (ARRAY['basic'::character varying, 'app_billing'::character varying, 'basic_premium'::character varying, 'host_billing'::character varying]::text[])),
  description text,
  address character varying NOT NULL,
  latitude numeric NOT NULL CHECK (latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  longitude numeric NOT NULL CHECK (longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  zone character varying,
  rating numeric NOT NULL DEFAULT 0.00 CHECK (rating >= 0::numeric AND rating <= 5::numeric),
  reviews_count integer NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
  visits_count integer NOT NULL DEFAULT 0 CHECK (visits_count >= 0),
  favorites_count integer NOT NULL DEFAULT 0 CHECK (favorites_count >= 0),
  capacity_min integer CHECK (capacity_min IS NULL OR capacity_min >= 0),
  capacity_max integer CHECK (capacity_max IS NULL OR capacity_max >= 0),
  hours character varying,
  price_per_hour numeric CHECK (price_per_hour IS NULL OR price_per_hour >= 0::numeric),
  currency character varying NOT NULL DEFAULT 'CLP'::character varying,
  wifi boolean NOT NULL DEFAULT false,
  outlets boolean NOT NULL DEFAULT false,
  parking boolean NOT NULL DEFAULT false,
  quietness_level integer CHECK (quietness_level IS NULL OR quietness_level >= 1 AND quietness_level <= 5),
  lighting_level integer CHECK (lighting_level IS NULL OR lighting_level >= 1 AND lighting_level <= 5),
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying, 'deleted'::character varying]::text[])),
  verified boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  images ARRAY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT places_pkey PRIMARY KEY (id),
  CONSTRAINT places_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.delegate_places (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delegate_id uuid NOT NULL,
  place_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT delegate_places_pkey PRIMARY KEY (id),
  CONSTRAINT delegate_places_delegate_id_fkey FOREIGN KEY (delegate_id) REFERENCES public.delegates(id),
  CONSTRAINT delegate_places_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);
CREATE TABLE public.place_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time without time zone,
  close_time time without time zone,
  is_closed boolean NOT NULL DEFAULT false,
  CONSTRAINT place_hours_pkey PRIMARY KEY (id),
  CONSTRAINT place_hours_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);
CREATE TABLE public.place_amenities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL,
  amenity_key character varying NOT NULL,
  amenity_name character varying NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  additional_info text,
  CONSTRAINT place_amenities_pkey PRIMARY KEY (id),
  CONSTRAINT place_amenities_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);
CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id uuid NOT NULL,
  reservation_dates ARRAY NOT NULL CHECK (array_length(reservation_dates, 1) IS NOT NULL),
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'rejected'::character varying, 'cancelled'::character varying, 'completed'::character varying]::text[])),
  total_amount numeric NOT NULL CHECK (total_amount >= 0::numeric),
  currency character varying NOT NULL DEFAULT 'CLP'::character varying,
  payment_method character varying,
  payment_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (payment_status::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying, 'refunded'::character varying, 'failed'::character varying]::text[])),
  guests_count integer NOT NULL DEFAULT 1 CHECK (guests_count >= 1),
  special_requests text,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT reservations_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  wifi_rating integer CHECK (wifi_rating IS NULL OR wifi_rating >= 1 AND wifi_rating <= 5),
  noise_rating integer CHECK (noise_rating IS NULL OR noise_rating >= 1 AND noise_rating <= 5),
  cleanliness_rating integer CHECK (cleanliness_rating IS NULL OR cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  helpful_count integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  verified_visit boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT reviews_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);
CREATE TABLE public.place_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id uuid NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['no_wifi'::character varying, 'crowded'::character varying, 'noisy'::character varying, 'no_outlets'::character varying, 'closed'::character varying, 'dirty'::character varying, 'no_parking'::character varying, 'other'::character varying]::text[])),
  description text,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'reviewing'::character varying, 'resolved'::character varying, 'dismissed'::character varying]::text[])),
  upvotes_count integer NOT NULL DEFAULT 0 CHECK (upvotes_count >= 0),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT place_reports_pkey PRIMARY KEY (id),
  CONSTRAINT place_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT place_reports_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id),
  CONSTRAINT place_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.place_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL,
  type character varying NOT NULL,
  reported_by uuid,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  upvotes integer NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  CONSTRAINT place_issues_pkey PRIMARY KEY (id),
  CONSTRAINT place_issues_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id),
  CONSTRAINT place_issues_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id)
);
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT favorites_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  message_type character varying NOT NULL DEFAULT 'text'::character varying CHECK (message_type::text = ANY (ARRAY['text'::character varying, 'image'::character varying, 'file'::character varying, 'location'::character varying]::text[])),
  attachment_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_by_sender boolean NOT NULL DEFAULT false,
  deleted_by_receiver boolean NOT NULL DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['issue_report'::character varying, 'favorite_issue'::character varying, 'reservation_confirmed'::character varying, 'new_message'::character varying, 'place_update'::character varying, 'review_response'::character varying, 'system'::character varying]::text[])),
  title character varying NOT NULL,
  message text NOT NULL,
  place_id uuid,
  reservation_id uuid,
  message_id uuid,
  read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  entity_type character varying,
  entity_id uuid,
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_path text,
  expires_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notifications_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id),
  CONSTRAINT notifications_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id),
  CONSTRAINT notifications_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject character varying NOT NULL,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['technical'::character varying, 'billing'::character varying, 'report'::character varying, 'suggestion'::character varying, 'other'::character varying]::text[])),
  priority character varying NOT NULL DEFAULT 'medium'::character varying CHECK (priority::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in_review'::character varying, 'resolved'::character varying, 'closed'::character varying]::text[])),
  assigned_to uuid,
  assigned_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  tags ARRAY,
  internal_notes text,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id)
);
CREATE TABLE public.support_ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid,
  sender_type character varying NOT NULL CHECK (sender_type::text = ANY (ARRAY['user'::character varying, 'support'::character varying, 'system'::character varying]::text[])),
  message text NOT NULL,
  attachments ARRAY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  edited_at timestamp with time zone,
  is_internal boolean NOT NULL DEFAULT false,
  CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id),
  CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id),
  CONSTRAINT support_ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.regions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  code character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT regions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL,
  name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cities_pkey PRIMARY KEY (id),
  CONSTRAINT cities_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id)
);
CREATE TABLE public.institutions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  city_id uuid,
  name character varying NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['Universidad'::character varying, 'Instituto Profesional'::character varying, 'Centro de Formación Técnica'::character varying]::text[])),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT institutions_pkey PRIMARY KEY (id),
  CONSTRAINT institutions_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.delegate_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'revoked'::text])),
  assigned_place_ids ARRAY NOT NULL DEFAULT ARRAY[]::uuid[],
  invited_by uuid,
  accepted_by uuid,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT delegate_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT delegate_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id),
  CONSTRAINT delegate_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(id)
);
CREATE TABLE public.place_report_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT place_report_confirmations_pkey PRIMARY KEY (id),
  CONSTRAINT place_report_confirmations_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.place_reports(id),
  CONSTRAINT place_report_confirmations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
