-- =============================================
-- NOOK - Database
-- IMPORTANTE: este script elimina y vuelve a crear las tablas.
-- =============================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET search_path TO public;



DROP VIEW IF EXISTS delegates_with_places CASCADE;
DROP VIEW IF EXISTS users_with_stats CASCADE;
DROP VIEW IF EXISTS places_with_stats CASCADE;

-- Eliminar tablas si existen (orden inverso por dependencias)
DROP TABLE IF EXISTS support_ticket_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS delegate_invitations CASCADE;
DROP TABLE IF EXISTS place_report_confirmations CASCADE;
DROP TABLE IF EXISTS place_reports CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS place_issues CASCADE;
DROP TABLE IF EXISTS delegate_places CASCADE;
DROP TABLE IF EXISTS delegates CASCADE;
DROP TABLE IF EXISTS place_amenities CASCADE;
DROP TABLE IF EXISTS place_spaces CASCADE;
DROP TABLE IF EXISTS place_hours CASCADE;
DROP TABLE IF EXISTS places CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- TABLA: users
-- Usuarios del sistema (estudiantes, trabajadores, admins)
-- Supabase Auth guarda credenciales en auth.users.
-- Esta tabla guarda solo el perfil publico y usa el mismo id de auth.users.
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'worker', 'admin', 'support', 'delegate')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'verified', 'suspended', 'blocked', 'pending')),
    profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    avatar_url TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_users_email_basic CHECK (POSITION('@' IN email) > 1)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- =============================================
-- TABLA: regions
-- Catalogo de regiones
-- =============================================
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regions_name ON regions(name);

-- =============================================
-- TABLA: cities
-- Catalogo de ciudades/comunas
-- =============================================
CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cities_region_id ON cities(region_id);
CREATE INDEX idx_cities_name ON cities(name);

-- =============================================
-- TABLA: institutions
-- Catalogo de instituciones educativas
-- =============================================
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_institutions_city_id ON institutions(city_id);
CREATE INDEX idx_institutions_name ON institutions(name);
CREATE INDEX idx_institutions_active ON institutions(active);

-- =============================================
-- TABLA: user_profiles
-- Perfiles extendidos según el rol del usuario
-- =============================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Campos para estudiantes
    university VARCHAR(255),
    career VARCHAR(255),
    subjects TEXT[], -- Array de materias/intereses
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,

    -- Campos para trabajadores
    company VARCHAR(255),
    position VARCHAR(255),
    is_independent BOOLEAN NOT NULL DEFAULT FALSE,
    industry VARCHAR(255), -- Rubro para independientes

    -- Campos comunes
    bio TEXT,
    profile_image_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_subjects ON user_profiles USING GIN(subjects);
CREATE INDEX idx_user_profiles_region_id ON user_profiles(region_id);
CREATE INDEX idx_user_profiles_city_id ON user_profiles(city_id);
CREATE INDEX idx_user_profiles_institution_id ON user_profiles(institution_id);

-- =============================================
-- TABLA: delegates
-- Delegados que administran lugares
-- =============================================
CREATE TABLE delegates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'suspended', 'pending')),
    subscription_active BOOLEAN NOT NULL DEFAULT FALSE,
    joined_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,

    UNIQUE(user_id)
);

CREATE INDEX idx_delegates_user_id ON delegates(user_id);
CREATE INDEX idx_delegates_status ON delegates(status);
CREATE INDEX idx_delegates_subscription_active ON delegates(subscription_active);

-- =============================================
-- TABLA: delegate_invitations
-- Invitaciones para convertir usuarios en delegados
-- =============================================
CREATE TABLE delegate_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    assigned_place_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(token)
);

CREATE INDEX idx_delegate_invitations_token ON delegate_invitations(token);
CREATE INDEX idx_delegate_invitations_email ON delegate_invitations(email);
CREATE INDEX idx_delegate_invitations_status ON delegate_invitations(status);
CREATE INDEX idx_delegate_invitations_invited_by ON delegate_invitations(invited_by);
CREATE INDEX idx_delegate_invitations_accepted_by ON delegate_invitations(accepted_by);

-- =============================================
-- TABLA: places
-- Lugares de estudio y trabajo
-- =============================================
CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('library', 'cafe', 'coworking', 'office', 'meeting_room', 'private_office', 'park')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('study', 'work')),
    plan_type VARCHAR(30) NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'app_billing', 'basic_premium', 'host_billing')),
    description TEXT,
    address VARCHAR(500) NOT NULL,

    -- Ubicación
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    zone VARCHAR(100),

    -- Rating y estadísticas
    rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    reviews_count INTEGER NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
    visits_count INTEGER NOT NULL DEFAULT 0 CHECK (visits_count >= 0),
    favorites_count INTEGER NOT NULL DEFAULT 0 CHECK (favorites_count >= 0),

    -- Capacidad y horarios
    capacity_min INTEGER CHECK (capacity_min IS NULL OR capacity_min >= 0),
    capacity_max INTEGER CHECK (capacity_max IS NULL OR capacity_max >= 0),
    hours VARCHAR(255),

    -- Precios
    price_per_hour DECIMAL(10, 2) CHECK (price_per_hour IS NULL OR price_per_hour >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
    website_url TEXT CHECK (website_url IS NULL OR website_url ~* '^https?://'),

    -- Servicios y ambiente
    wifi BOOLEAN NOT NULL DEFAULT FALSE,
    outlets BOOLEAN NOT NULL DEFAULT FALSE,
    parking BOOLEAN NOT NULL DEFAULT FALSE,
    quietness_level INTEGER CHECK (quietness_level IS NULL OR quietness_level BETWEEN 1 AND 5),
    lighting_level INTEGER CHECK (lighting_level IS NULL OR lighting_level BETWEEN 1 AND 5),

    -- Estado y visibilidad
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'deleted')),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,

    -- Imágenes
    images TEXT[],

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT chk_places_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_places_longitude CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT chk_places_capacity_range CHECK (
        capacity_min IS NULL
        OR capacity_max IS NULL
        OR capacity_min <= capacity_max
    )
);

CREATE INDEX idx_places_type ON places(type);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_plan_type ON places(plan_type);
CREATE INDEX idx_places_status ON places(status);
CREATE INDEX idx_places_zone ON places(zone);
CREATE INDEX idx_places_location ON places(latitude, longitude);
CREATE INDEX idx_places_rating ON places(rating DESC);
CREATE INDEX idx_places_featured ON places(featured) WHERE featured = TRUE;
CREATE INDEX idx_places_images ON places USING GIN(images);
CREATE INDEX idx_places_website_url ON places(website_url) WHERE website_url IS NOT NULL;

-- =============================================
-- TABLA: delegate_places
-- Relación entre delegados y lugares asignados
-- =============================================
CREATE TABLE delegate_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegate_id UUID NOT NULL REFERENCES delegates(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(delegate_id, place_id)
);

CREATE INDEX idx_delegate_places_delegate ON delegate_places(delegate_id);
CREATE INDEX idx_delegate_places_place ON delegate_places(place_id);

-- =============================================
-- TABLA: place_hours
-- Horarios detallados por día de la semana
-- =============================================
CREATE TABLE place_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo, 6 = Sábado
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,

    UNIQUE(place_id, day_of_week),

    CONSTRAINT chk_place_hours_valid CHECK (
        is_closed = TRUE
        OR (
            open_time IS NOT NULL
            AND close_time IS NOT NULL
            AND close_time > open_time
        )
    )
);

CREATE INDEX idx_place_hours_place ON place_hours(place_id);
CREATE INDEX idx_place_hours_day ON place_hours(day_of_week);

-- =============================================
-- TABLA: place_amenities
-- Servicios y comodidades de cada lugar
-- =============================================
CREATE TABLE place_amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    amenity_key VARCHAR(50) NOT NULL,
    amenity_name VARCHAR(100) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    additional_info TEXT,

    UNIQUE(place_id, amenity_key)
);

CREATE INDEX idx_place_amenities_place ON place_amenities(place_id);
CREATE INDEX idx_place_amenities_key ON place_amenities(amenity_key);

-- Espacios internos informativos, sin reservas (salas, oficinas, piezas de estudio, etc.).
CREATE TABLE place_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    price_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (price_per_hour >= 0),
    billing_unit VARCHAR(10) NOT NULL DEFAULT 'hour' CHECK (billing_unit IN ('hour', 'day', 'week', 'month')),
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_place_spaces_place ON place_spaces(place_id);

-- =============================================
-- TABLA: reservations
-- Reservas de espacios de trabajo
-- =============================================
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,

    -- Fechas y horarios
    reservation_dates DATE[] NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Estado y pago
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),

    -- Información adicional
    guests_count INTEGER NOT NULL DEFAULT 1 CHECK (guests_count >= 1),
    special_requests TEXT,

    -- Cancelación
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_reservations_time_range CHECK (end_time > start_time),
    CONSTRAINT chk_reservations_dates_not_empty CHECK (array_length(reservation_dates, 1) IS NOT NULL)
);

CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_place ON reservations(place_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_payment_status ON reservations(payment_status);
CREATE INDEX idx_reservations_dates ON reservations USING GIN(reservation_dates);

-- =============================================
-- TABLA: reviews
-- Reseñas y valoraciones de lugares
-- =============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,

    -- Ratings específicos
    wifi_rating INTEGER CHECK (wifi_rating IS NULL OR wifi_rating BETWEEN 1 AND 5),
    noise_rating INTEGER CHECK (noise_rating IS NULL OR noise_rating BETWEEN 1 AND 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating IS NULL OR cleanliness_rating BETWEEN 1 AND 5),

    helpful_count INTEGER NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
    verified_visit BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, place_id)
);

CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_place ON reviews(place_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);

-- =============================================
-- TABLA: place_reports
-- Reportes tipo Waze sobre problemas en lugares
-- =============================================
CREATE TABLE place_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL CHECK (type IN ('no_wifi', 'crowded', 'noisy', 'no_outlets', 'closed', 'dirty', 'no_parking', 'other')),
    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),

    upvotes_count INTEGER NOT NULL DEFAULT 0 CHECK (upvotes_count >= 0),

    -- Moderación
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_place_reports_user ON place_reports(user_id);
CREATE INDEX idx_place_reports_place ON place_reports(place_id);
CREATE INDEX idx_place_reports_status ON place_reports(status);
CREATE INDEX idx_place_reports_type ON place_reports(type);

-- =============================================
-- TABLA: place_report_confirmations
-- Confirmaciones unicas por usuario para reportes de lugar
-- =============================================
CREATE TABLE place_report_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES place_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(report_id, user_id)
);

CREATE INDEX idx_place_report_confirmations_report ON place_report_confirmations(report_id);
CREATE INDEX idx_place_report_confirmations_user ON place_report_confirmations(user_id);

-- =============================================
-- TABLA: place_issues
-- Problemas/incidencias históricas (para analytics)
-- =============================================
CREATE TABLE place_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    upvotes INTEGER NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_place_issues_place ON place_issues(place_id);
CREATE INDEX idx_place_issues_timestamp ON place_issues(timestamp DESC);
CREATE INDEX idx_place_issues_resolved ON place_issues(resolved);

-- =============================================
-- TABLA: favorites
-- Lugares favoritos de cada usuario
-- =============================================
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, place_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_place ON favorites(place_id);

-- =============================================
-- TABLA: messages
-- Mensajes entre usuarios (chat)
-- =============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,

    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location')),
    attachment_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by_sender BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_by_receiver BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_messages_different_users CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(receiver_id, read) WHERE read = FALSE;

-- =============================================
-- TABLA: notifications
-- Notificaciones para usuarios
-- =============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL CHECK (type IN ('issue_report', 'favorite_issue', 'reservation_confirmed', 'new_message', 'place_update', 'review_response', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Referencias opcionales
    place_id UUID REFERENCES places(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- Referencia generica para entidades nuevas sin agregar columnas por cada caso.
    entity_type VARCHAR(80),
    entity_id UUID,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    action_path TEXT,

    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_place ON notifications(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_notifications_user_created_active ON notifications(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_user_unread_active ON notifications(user_id, created_at DESC) WHERE read = FALSE AND deleted_at IS NULL;
CREATE UNIQUE INDEX notifications_unique_active_entity_user_idx
ON notifications(user_id, type, entity_type, entity_id)
WHERE entity_id IS NOT NULL AND deleted_at IS NULL;

-- =============================================
-- TABLA: support_tickets
-- Tickets de soporte
-- =============================================
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('technical', 'billing', 'report', 'suggestion', 'other')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'closed')),

    -- Asignación
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,

    -- Seguimiento
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,

    -- Metadata
    tags TEXT[],
    internal_notes TEXT
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_tags ON support_tickets USING GIN(tags);

-- =============================================
-- TABLA: support_ticket_messages
-- Mensajes dentro de tickets de soporte
-- =============================================
CREATE TABLE support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'support', 'system')),

    message TEXT NOT NULL,
    attachments TEXT[],

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_sender ON support_ticket_messages(sender_id);
CREATE INDEX idx_support_ticket_messages_created ON support_ticket_messages(created_at);
CREATE INDEX idx_support_ticket_messages_attachments ON support_ticket_messages USING GIN(attachments);

-- =============================================
-- VISTAS ÚTILES
-- =============================================

-- Vista de lugares con estadísticas completas.
-- Corrección aplicada:
-- No se usa "favorites_count" como alias calculado porque places ya tiene esa columna.
CREATE OR REPLACE VIEW places_with_stats
WITH (security_invoker = true) AS
SELECT
    p.*,
    COUNT(DISTINCT r.id) AS total_reservations,
    COUNT(DISTINCT f.id) AS favorites_count_calculated,
    COUNT(DISTINCT pr.id) AS active_reports_count,
    COUNT(DISTINCT rev.id) AS reviews_count_calculated,
    ROUND(COALESCE(AVG(rev.rating), 0)::NUMERIC, 2) AS avg_rating_calculated
FROM places p
LEFT JOIN reservations r ON p.id = r.place_id
LEFT JOIN favorites f ON p.id = f.place_id
LEFT JOIN place_reports pr ON p.id = pr.place_id AND pr.status IN ('pending', 'reviewing')
LEFT JOIN reviews rev ON p.id = rev.place_id
GROUP BY p.id;

-- Vista de usuarios con estadísticas
CREATE OR REPLACE VIEW users_with_stats
WITH (security_invoker = true) AS
SELECT
    u.*,
    COUNT(DISTINCT r.id) AS total_reservations,
    COUNT(DISTINCT pr.id) AS total_reports,
    COUNT(DISTINCT rev.id) AS total_reviews,
    COUNT(DISTINCT f.id) AS total_favorites
FROM users u
LEFT JOIN reservations r ON u.id = r.user_id
LEFT JOIN place_reports pr ON u.id = pr.user_id
LEFT JOIN reviews rev ON u.id = rev.user_id
LEFT JOIN favorites f ON u.id = f.user_id
WHERE u.role IN ('student', 'worker')
GROUP BY u.id;

-- Vista de delegados con lugares asignados
CREATE OR REPLACE VIEW delegates_with_places
WITH (security_invoker = true) AS
SELECT
    d.*,
    u.name,
    u.email,
    u.phone,
    COUNT(dp.place_id) AS places_count,
    COALESCE(
        ARRAY_AGG(dp.place_id) FILTER (WHERE dp.place_id IS NOT NULL),
        ARRAY[]::UUID[]
    ) AS assigned_place_ids
FROM delegates d
JOIN users u ON d.user_id = u.id
LEFT JOIN delegate_places dp ON d.id = dp.delegate_id
GROUP BY d.id, u.name, u.email, u.phone;

-- Lugares publicos con ranking premium calculado en base de datos.
CREATE OR REPLACE FUNCTION list_public_places()
RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT,
    category TEXT,
    plan_type TEXT,
    description TEXT,
    address TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    zone TEXT,
    rating DECIMAL,
    reviews_count INTEGER,
    capacity_min INTEGER,
    capacity_max INTEGER,
    hours TEXT,
    price_per_hour DECIMAL,
    website_url TEXT,
    wifi BOOLEAN,
    outlets BOOLEAN,
    parking BOOLEAN,
    quietness_level INTEGER,
    lighting_level INTEGER,
    images TEXT[],
    is_promoted BOOLEAN,
    place_amenities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name::TEXT,
        p.type::TEXT,
        p.category::TEXT,
        p.plan_type::TEXT,
        p.description,
        p.address::TEXT,
        p.latitude,
        p.longitude,
        p.zone::TEXT,
        p.rating,
        p.reviews_count,
        p.capacity_min,
        p.capacity_max,
        p.hours::TEXT,
        p.price_per_hour,
        p.website_url,
        p.wifi,
        p.outlets,
        p.parking,
        p.quietness_level,
        p.lighting_level,
        p.images,
        EXISTS (
            SELECT 1
            FROM delegate_places dp
            JOIN delegates d ON d.id = dp.delegate_id
            WHERE dp.place_id = p.id
            AND d.status = 'active'
            AND d.subscription_active = TRUE
        ) AS is_promoted,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'amenity_key', pa.amenity_key,
                        'amenity_name', pa.amenity_name,
                        'is_available', pa.is_available,
                        'additional_info', pa.additional_info
                    )
                    ORDER BY pa.amenity_name
                )
                FROM place_amenities pa
                WHERE pa.place_id = p.id
            ),
            '[]'::jsonb
        ) AS place_amenities
    FROM places p
    WHERE p.status = 'active'
    ORDER BY
        EXISTS (
            SELECT 1
            FROM delegate_places dp
            JOIN delegates d ON d.id = dp.delegate_id
            WHERE dp.place_id = p.id
            AND d.status = 'active'
            AND d.subscription_active = TRUE
        ) DESC,
        p.rating DESC,
        p.reviews_count DESC,
        p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION list_public_places() TO authenticated;

-- =============================================
-- FUNCIONES Y TRIGGERS
-- =============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_places_updated_at
BEFORE UPDATE ON places
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_place_reports_updated_at
BEFORE UPDATE ON place_reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delegate_invitations_updated_at
BEFORE UPDATE ON delegate_invitations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función auxiliar para recalcular el rating de un lugar
CREATE OR REPLACE FUNCTION refresh_place_rating(p_place_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE places
    SET
        rating = COALESCE(
            (
                SELECT ROUND(AVG(rating)::NUMERIC, 2)
                FROM reviews
                WHERE place_id = p_place_id
            ),
            0.00
        ),
        reviews_count = (
            SELECT COUNT(*)::INTEGER
            FROM reviews
            WHERE place_id = p_place_id
        )
    WHERE id = p_place_id;
END;
$$ LANGUAGE plpgsql;

-- Función trigger para actualizar el rating de un lugar
CREATE OR REPLACE FUNCTION update_place_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_place_rating(OLD.place_id);
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.place_id IS DISTINCT FROM NEW.place_id THEN
        PERFORM refresh_place_rating(OLD.place_id);
    END IF;

    PERFORM refresh_place_rating(NEW.place_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_place_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_place_rating();

-- Función auxiliar para recalcular contador de favoritos
CREATE OR REPLACE FUNCTION refresh_place_favorites_count(p_place_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE places
    SET favorites_count = (
        SELECT COUNT(*)::INTEGER
        FROM favorites
        WHERE place_id = p_place_id
    )
    WHERE id = p_place_id;
END;
$$ LANGUAGE plpgsql;

-- Función trigger para actualizar contador de favoritos
CREATE OR REPLACE FUNCTION update_place_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_place_favorites_count(OLD.place_id);
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.place_id IS DISTINCT FROM NEW.place_id THEN
        PERFORM refresh_place_favorites_count(OLD.place_id);
    END IF;

    PERFORM refresh_place_favorites_count(NEW.place_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_favorites_count
AFTER INSERT OR UPDATE OR DELETE ON favorites
FOR EACH ROW EXECUTE FUNCTION update_place_favorites_count();

-- =============================================
-- USUARIOS DEMO
-- =============================================
-- No insertes usuarios demo directamente en public.users si usaras Supabase Auth.
-- Deben crearse en Authentication > Users o desde un backend seguro con service role.
-- El trigger on_auth_user_created creara automaticamente la fila en public.users.

-- =============================================
-- COMENTARIOS ADICIONALES
-- =============================================

COMMENT ON TABLE users IS 'Usuarios del sistema con roles: student, worker, admin, support, delegate';
COMMENT ON TABLE user_profiles IS 'Perfiles extendidos de usuarios según rol';
COMMENT ON TABLE places IS 'Lugares de estudio y trabajo';
COMMENT ON TABLE reservations IS 'Reservas de espacios de trabajo';
COMMENT ON TABLE place_reports IS 'Reportes tipo Waze sobre problemas en lugares';
COMMENT ON TABLE place_issues IS 'Incidencias históricas de lugares para análisis';
COMMENT ON TABLE support_tickets IS 'Sistema de soporte con tickets';
COMMENT ON TABLE support_ticket_messages IS 'Mensajes asociados a tickets de soporte';
COMMENT ON TABLE messages IS 'Sistema de mensajería entre usuarios';
COMMENT ON TABLE notifications IS 'Notificaciones para usuarios';
COMMENT ON TABLE delegates IS 'Delegados que administran lugares específicos';
COMMENT ON TABLE delegate_places IS 'Asignación de lugares a delegados';
COMMENT ON TABLE favorites IS 'Lugares favoritos de cada usuario';
COMMENT ON TABLE reviews IS 'Reseñas y valoraciones de lugares';
COMMENT ON TABLE place_hours IS 'Horarios detallados por día de la semana';
COMMENT ON TABLE place_amenities IS 'Servicios y comodidades disponibles por lugar';
COMMENT ON TABLE place_spaces IS 'Espacios informativos dentro de un lugar, sin reservas';

COMMENT ON TABLE delegate_invitations IS 'Invitaciones enviadas por administradores para crear delegados';

-- =============================================
-- SUPABASE AUTH Y ROW LEVEL SECURITY
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegate_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegates ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegate_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_report_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Permisos de API para usuarios con sesion. Las policies de abajo filtran filas.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users, user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON places, place_amenities, place_spaces TO authenticated;
GRANT SELECT ON place_hours, place_issues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reservations, reviews, place_reports, favorites, messages TO authenticated;
GRANT SELECT, INSERT ON place_report_confirmations TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON support_tickets, support_ticket_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON delegates, delegate_places TO authenticated;
GRANT SELECT, INSERT, UPDATE ON delegate_invitations TO authenticated;

-- Perfil publico del usuario autenticado.
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id);

-- Un participante puede resolver el nombre del otro usuario solo cuando comparten un chat activo.
CREATE POLICY users_select_chat_participants ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM messages
            WHERE (messages.sender_id = auth.uid() AND messages.receiver_id = users.id)
               OR (messages.receiver_id = auth.uid() AND messages.sender_id = users.id)
        )
    );

CREATE POLICY users_insert_own ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY users_update_own ON users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY user_profiles_select_own ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_profiles_insert_own ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_update_own ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lugares y datos publicos de catalogo.
CREATE POLICY places_select_active ON places
    FOR SELECT USING (status = 'active');

CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_current_user_delegate_for_place(target_place_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM delegates
        JOIN delegate_places ON delegate_places.delegate_id = delegates.id
        WHERE delegates.user_id = auth.uid()
        AND delegates.status = 'active'
        AND delegate_places.place_id = target_place_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION is_current_user_delegate_for_place(UUID) TO authenticated;

CREATE POLICY users_select_reservation_participants_for_managed_places ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM reservations
            WHERE reservations.user_id = users.id
            AND (
                is_current_user_admin()
                OR is_current_user_delegate_for_place(reservations.place_id)
            )
        )
    );

CREATE OR REPLACE FUNCTION is_current_user_place_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'delegate')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE POLICY places_insert_admin ON places
    FOR INSERT WITH CHECK (is_current_user_place_manager());

CREATE POLICY places_update_admin ON places
    FOR UPDATE USING (is_current_user_place_manager()) WITH CHECK (is_current_user_place_manager());

CREATE POLICY places_delete_admin ON places
    FOR DELETE USING (is_current_user_place_manager());

CREATE POLICY place_hours_select_active_places ON place_hours
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM places
            WHERE places.id = place_hours.place_id
            AND places.status = 'active'
        )
    );

CREATE POLICY place_amenities_select_active_places ON place_amenities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM places
            WHERE places.id = place_amenities.place_id
            AND places.status = 'active'
        )
    );

CREATE POLICY place_amenities_insert_admin ON place_amenities
    FOR INSERT WITH CHECK (is_current_user_place_manager());

CREATE POLICY place_amenities_update_admin ON place_amenities
    FOR UPDATE USING (is_current_user_place_manager()) WITH CHECK (is_current_user_place_manager());

CREATE POLICY place_amenities_delete_admin ON place_amenities
    FOR DELETE USING (is_current_user_place_manager());

CREATE POLICY place_spaces_select_active_places ON place_spaces
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM places WHERE places.id = place_spaces.place_id AND places.status = 'active')
    );

CREATE POLICY place_spaces_insert_manager ON place_spaces
    FOR INSERT WITH CHECK (is_current_user_place_manager());

CREATE POLICY place_spaces_update_manager ON place_spaces
    FOR UPDATE USING (is_current_user_place_manager()) WITH CHECK (is_current_user_place_manager());

CREATE POLICY place_spaces_delete_manager ON place_spaces
    FOR DELETE USING (is_current_user_place_manager());

-- Reservas propias.
CREATE POLICY reservations_select_own ON reservations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY reservations_select_place_manager ON reservations
    FOR SELECT USING (
        is_current_user_admin()
        OR is_current_user_delegate_for_place(place_id)
    );

CREATE POLICY reservations_insert_own ON reservations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY reservations_update_own_pending ON reservations
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY reservations_update_place_manager ON reservations
    FOR UPDATE USING (
        is_current_user_admin()
        OR is_current_user_delegate_for_place(place_id)
    )
    WITH CHECK (
        is_current_user_admin()
        OR is_current_user_delegate_for_place(place_id)
    );

-- Reviews propias y lectura publica.
CREATE POLICY reviews_select_all ON reviews
    FOR SELECT USING (true);

CREATE POLICY reviews_insert_own ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_update_own ON reviews
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_delete_own ON reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Reportes de lugares.
CREATE POLICY place_reports_select_own_public_or_manager ON place_reports
    FOR SELECT USING (
        auth.uid() = user_id
        OR status IN ('pending', 'reviewing')
        OR is_current_user_admin()
        OR is_current_user_delegate_for_place(place_id)
    );

CREATE POLICY place_reports_insert_own ON place_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY place_reports_update_manager ON place_reports
    FOR UPDATE USING (
        is_current_user_admin()
        OR is_current_user_delegate_for_place(place_id)
        OR (auth.uid() = user_id AND status = 'pending')
    )
    WITH CHECK (
        is_current_user_admin()
        OR is_current_user_delegate_for_place(place_id)
        OR auth.uid() = user_id
    );

CREATE POLICY place_report_confirmations_select_own_or_public_reports ON place_report_confirmations
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM place_reports
            WHERE place_reports.id = place_report_confirmations.report_id
            AND place_reports.status IN ('pending', 'reviewing', 'resolved')
        )
    );

CREATE POLICY place_report_confirmations_insert_own ON place_report_confirmations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY place_issues_select_all ON place_issues
    FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION confirm_place_report(target_report_id UUID)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER;
    next_upvotes INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    INSERT INTO place_report_confirmations (report_id, user_id)
    VALUES (target_report_id, auth.uid())
    ON CONFLICT (report_id, user_id) DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    IF inserted_count = 1 THEN
        UPDATE place_reports
        SET upvotes_count = upvotes_count + 1,
            updated_at = NOW()
        WHERE id = target_report_id
        RETURNING upvotes_count INTO next_upvotes;
    ELSE
        SELECT upvotes_count
        INTO next_upvotes
        FROM place_reports
        WHERE id = target_report_id;
    END IF;

    RETURN COALESCE(next_upvotes, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION confirm_place_report(UUID) TO authenticated;

-- Favoritos propios.
CREATE POLICY favorites_select_own ON favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY favorites_insert_own ON favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY favorites_delete_own ON favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Chat entre participantes.
CREATE POLICY messages_select_participants ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY messages_insert_sender ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY messages_update_receiver_or_sender ON messages
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Notificaciones propias.
CREATE POLICY notifications_select_own ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Crea o actualiza una notificacion accionable para un usuario.
CREATE OR REPLACE FUNCTION create_user_notification(
    target_user_id UUID,
    notification_type VARCHAR,
    notification_title VARCHAR,
    notification_message TEXT,
    related_place_id UUID DEFAULT NULL,
    related_reservation_id UUID DEFAULT NULL,
    related_message_id UUID DEFAULT NULL,
    related_entity_type VARCHAR DEFAULT NULL,
    related_entity_id UUID DEFAULT NULL,
    actor_id UUID DEFAULT NULL,
    notification_metadata JSONB DEFAULT '{}'::JSONB,
    notification_action_path TEXT DEFAULT NULL,
    notification_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    next_notification_id UUID;
BEGIN
    IF target_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        place_id,
        reservation_id,
        message_id,
        entity_type,
        entity_id,
        actor_user_id,
        metadata,
        action_path,
        expires_at
    ) VALUES (
        target_user_id,
        notification_type,
        notification_title,
        notification_message,
        related_place_id,
        related_reservation_id,
        related_message_id,
        related_entity_type,
        related_entity_id,
        actor_id,
        COALESCE(notification_metadata, '{}'::JSONB),
        notification_action_path,
        notification_expires_at
    )
    ON CONFLICT (user_id, type, entity_type, entity_id)
    WHERE entity_id IS NOT NULL AND deleted_at IS NULL
    DO UPDATE SET
        title = EXCLUDED.title,
        message = EXCLUDED.message,
        metadata = EXCLUDED.metadata,
        action_path = EXCLUDED.action_path,
        read = FALSE,
        read_at = NULL,
        created_at = NOW(),
        deleted_at = NULL
    RETURNING id INTO next_notification_id;

    RETURN next_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Notifica a usuarios que tienen como favorito un lugar con nuevo reporte.
CREATE OR REPLACE FUNCTION notify_favorite_place_report()
RETURNS TRIGGER AS $$
DECLARE
    place_name TEXT;
BEGIN
    SELECT name INTO place_name
    FROM places
    WHERE id = NEW.place_id;

    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        place_id,
        entity_type,
        entity_id,
        actor_user_id,
        metadata,
        action_path
    )
    SELECT
        favorites.user_id,
        'favorite_issue',
        'Problema en lugar favorito',
        COALESCE(place_name, 'Un lugar favorito') || ' recibio un nuevo reporte.',
        NEW.place_id,
        'place_report',
        NEW.id,
        NEW.user_id,
        jsonb_build_object(
            'place_name', place_name,
            'report_type', NEW.type,
            'report_description', NEW.description
        ),
        '/app/place/' || NEW.place_id
    FROM favorites
    WHERE favorites.place_id = NEW.place_id
    AND favorites.user_id <> NEW.user_id
    ON CONFLICT (user_id, type, entity_type, entity_id)
    WHERE entity_id IS NOT NULL AND deleted_at IS NULL
    DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_favorite_place_report_on_insert
AFTER INSERT ON place_reports
FOR EACH ROW EXECUTE FUNCTION notify_favorite_place_report();

-- Notifica al receptor cuando llega un nuevo mensaje.
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
BEGIN
    SELECT name INTO sender_name
    FROM users
    WHERE id = NEW.sender_id;

    PERFORM create_user_notification(
        NEW.receiver_id,
        'new_message',
        'Nuevo mensaje',
        COALESCE(sender_name, 'Un usuario') || ' te envio un mensaje.',
        NULL,
        NULL,
        NEW.id,
        'message',
        NEW.id,
        NEW.sender_id,
        jsonb_build_object('sender_name', sender_name),
        '/app/chat/' || NEW.sender_id,
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_new_message_on_insert
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Notifica al usuario cuando una reserva pasa a confirmada.
CREATE OR REPLACE FUNCTION notify_reservation_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    place_name TEXT;
BEGIN
    IF NEW.status <> 'confirmed' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT name INTO place_name
    FROM places
    WHERE id = NEW.place_id;

    PERFORM create_user_notification(
        NEW.user_id,
        'reservation_confirmed',
        'Reserva confirmada',
        'Tu reserva en ' || COALESCE(place_name, 'un lugar') || ' fue confirmada.',
        NEW.place_id,
        NEW.id,
        NULL,
        'reservation',
        NEW.id,
        NULL,
        jsonb_build_object('place_name', place_name),
        '/app/place/' || NEW.place_id,
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_reservation_confirmed_on_change
AFTER INSERT OR UPDATE OF status ON reservations
FOR EACH ROW EXECUTE FUNCTION notify_reservation_confirmed();

REVOKE ALL ON FUNCTION create_user_notification(
    UUID,
    VARCHAR,
    VARCHAR,
    TEXT,
    UUID,
    UUID,
    UUID,
    VARCHAR,
    UUID,
    UUID,
    JSONB,
    TEXT,
    TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION notify_favorite_place_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION notify_reservation_confirmed() FROM PUBLIC, anon, authenticated;

-- Tickets de soporte propios.
CREATE POLICY support_tickets_select_own ON support_tickets
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY support_tickets_insert_own ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY support_tickets_update_own ON support_tickets
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = assigned_to)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY support_ticket_messages_select_participants ON support_ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = support_ticket_messages.ticket_id
            AND (support_tickets.user_id = auth.uid() OR support_tickets.assigned_to = auth.uid())
        )
    );

CREATE POLICY support_ticket_messages_insert_participants ON support_ticket_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = support_ticket_messages.ticket_id
            AND (support_tickets.user_id = auth.uid() OR support_tickets.assigned_to = auth.uid())
        )
    );

-- Delegados: pueden leer su registro y sus asignaciones.
CREATE POLICY delegates_select_own ON delegates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY delegates_select_admin ON delegates
    FOR SELECT USING (is_current_user_admin());

CREATE POLICY delegates_insert_admin ON delegates
    FOR INSERT WITH CHECK (is_current_user_admin());

CREATE POLICY delegates_update_admin ON delegates
    FOR UPDATE USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY delegates_delete_admin ON delegates
    FOR DELETE USING (is_current_user_admin());

CREATE POLICY delegate_places_select_own ON delegate_places
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM delegates
            WHERE delegates.id = delegate_places.delegate_id
            AND delegates.user_id = auth.uid()
        )
    );

CREATE POLICY delegate_places_select_admin ON delegate_places
    FOR SELECT USING (is_current_user_admin());

CREATE POLICY delegate_places_insert_admin ON delegate_places
    FOR INSERT WITH CHECK (is_current_user_admin());

CREATE POLICY delegate_places_update_admin ON delegate_places
    FOR UPDATE USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY delegate_places_delete_admin ON delegate_places
    FOR DELETE USING (is_current_user_admin());

-- Invitaciones de delegados: los admins las administran; los invitados las consultan por RPC.
CREATE POLICY delegate_invitations_select_admin ON delegate_invitations
    FOR SELECT USING (is_current_user_admin());

CREATE POLICY delegate_invitations_insert_admin ON delegate_invitations
    FOR INSERT WITH CHECK (is_current_user_admin());

CREATE POLICY delegate_invitations_update_admin ON delegate_invitations
    FOR UPDATE USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- Permite validar si un correo ya tiene cuenta sin exponer filas de users.
CREATE OR REPLACE FUNCTION email_account_exists(lookup_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM users
        WHERE lower(users.email) = lower(trim(lookup_email))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Devuelve una invitacion por token sin exponer la tabla completa al cliente anonimo.
CREATE OR REPLACE FUNCTION get_delegate_invitation(invitation_token UUID)
RETURNS TABLE (
    id UUID,
    token UUID,
    email TEXT,
    name TEXT,
    phone TEXT,
    status TEXT,
    assigned_place_ids UUID[],
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        di.id,
        di.token,
        di.email,
        di.name,
        di.phone,
        CASE
            WHEN di.status = 'pending' AND di.expires_at < NOW() THEN 'expired'
            ELSE di.status
        END AS status,
        di.assigned_place_ids,
        di.expires_at,
        di.created_at
    FROM delegate_invitations di
    WHERE di.token = invitation_token
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Reclama una invitacion pendiente y asigna el rol/lugares al usuario autenticado.
CREATE OR REPLACE FUNCTION claim_delegate_invitation(invitation_token UUID)
RETURNS VOID AS $$
DECLARE
    invitation_record delegate_invitations%ROWTYPE;
    next_delegate_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    SELECT *
    INTO invitation_record
    FROM delegate_invitations
    WHERE token = invitation_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid_delegate_invitation';
    END IF;

    IF invitation_record.status <> 'pending' OR invitation_record.expires_at < NOW() THEN
        IF invitation_record.status = 'pending' AND invitation_record.expires_at < NOW() THEN
            UPDATE delegate_invitations
            SET status = 'expired'
            WHERE id = invitation_record.id;
        END IF;

        RAISE EXCEPTION 'invalid_delegate_invitation';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM users
        WHERE id = auth.uid()
        AND lower(email) = lower(invitation_record.email)
    ) THEN
        RAISE EXCEPTION 'delegate_invitation_email_mismatch';
    END IF;

    UPDATE users
    SET
        role = 'delegate',
        status = 'active',
        name = COALESCE(NULLIF(users.name, ''), invitation_record.name),
        phone = COALESCE(users.phone, invitation_record.phone),
        updated_at = NOW()
    WHERE id = auth.uid();

    INSERT INTO delegates (user_id, status, joined_date, last_active)
    VALUES (auth.uid(), 'active', NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        status = 'active',
        last_active = NOW()
    RETURNING id INTO next_delegate_id;

    DELETE FROM delegate_places
    WHERE delegate_id = next_delegate_id;

    INSERT INTO delegate_places (delegate_id, place_id)
    SELECT next_delegate_id, assigned_place.place_id
    FROM unnest(invitation_record.assigned_place_ids) AS assigned_place(place_id)
    ON CONFLICT (delegate_id, place_id) DO NOTHING;

    UPDATE delegate_invitations
    SET
        status = 'accepted',
        accepted_by = auth.uid(),
        accepted_at = NOW()
    WHERE id = invitation_record.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION email_account_exists(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_delegate_invitation(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_delegate_invitation(UUID) TO authenticated;

-- Bucket publico para imagenes de lugares.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'place-images',
    'place-images',
    TRUE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS place_images_select_public ON storage.objects;
DROP POLICY IF EXISTS place_images_insert_admin ON storage.objects;
DROP POLICY IF EXISTS place_images_update_admin ON storage.objects;
DROP POLICY IF EXISTS place_images_delete_admin ON storage.objects;

CREATE POLICY place_images_select_public ON storage.objects
    FOR SELECT USING (bucket_id = 'place-images');

CREATE POLICY place_images_insert_admin ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'place-images' AND public.is_current_user_place_manager());

CREATE POLICY place_images_update_admin ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'place-images' AND public.is_current_user_place_manager())
    WITH CHECK (bucket_id = 'place-images' AND public.is_current_user_place_manager());

CREATE POLICY place_images_delete_admin ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'place-images' AND public.is_current_user_place_manager());

-- Trigger que crea/sincroniza public.users cuando se crea un usuario en Supabase Auth.
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (
        id,
        email,
        name,
        phone,
        role,
        status,
        profile_completed,
        email_verified
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        'active',
        FALSE,
        NEW.email_confirmed_at IS NOT NULL
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
        phone = COALESCE(EXCLUDED.phone, users.phone),
        email_verified = EXCLUDED.email_verified,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

CREATE OR REPLACE FUNCTION handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        email = NEW.email,
        email_verified = NEW.email_confirmed_at IS NOT NULL,
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_auth_user_updated();

-- Sincroniza usuarios que ya existian en Authentication antes de instalar el trigger.
INSERT INTO users (
    id,
    email,
    name,
    phone,
    role,
    status,
    profile_completed,
    email_verified
)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    au.raw_user_meta_data->>'phone',
    COALESCE(au.raw_user_meta_data->>'role', 'student'),
    'active',
    FALSE,
    au.email_confirmed_at IS NOT NULL
FROM auth.users au
WHERE au.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
    phone = COALESCE(EXCLUDED.phone, users.phone),
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();

-- Eventos de navegación para medir visibilidad y aperturas de cada lugar.
CREATE TABLE IF NOT EXISTS place_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('home_impression', 'details_view')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_analytics_events_type_created_at
    ON place_analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_place_analytics_events_place_created_at
    ON place_analytics_events(place_id, created_at DESC);

ALTER TABLE place_analytics_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON place_analytics_events TO authenticated;

CREATE POLICY place_analytics_events_insert_own ON place_analytics_events
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM places
            WHERE places.id = place_analytics_events.place_id
              AND places.status = 'active'
        )
    );

CREATE POLICY place_analytics_events_select_admin ON place_analytics_events
    FOR SELECT USING (is_current_user_admin());

COMMIT;
