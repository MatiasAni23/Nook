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
    joined_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,

    UNIQUE(user_id)
);

CREATE INDEX idx_delegates_user_id ON delegates(user_id);
CREATE INDEX idx_delegates_status ON delegates(status);

-- =============================================
-- TABLA: places
-- Lugares de estudio y trabajo
-- =============================================
CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('library', 'cafe', 'coworking', 'office', 'meeting_room', 'private_office', 'park')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('study', 'work')),
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
    hours VARCHAR(100),

    -- Precios
    price_per_hour DECIMAL(10, 2) CHECK (price_per_hour IS NULL OR price_per_hour >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'CLP',

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
CREATE INDEX idx_places_status ON places(status);
CREATE INDEX idx_places_zone ON places(zone);
CREATE INDEX idx_places_location ON places(latitude, longitude);
CREATE INDEX idx_places_rating ON places(rating DESC);
CREATE INDEX idx_places_featured ON places(featured) WHERE featured = TRUE;
CREATE INDEX idx_places_images ON places USING GIN(images);

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

    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

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

-- =============================================
-- SUPABASE AUTH Y ROW LEVEL SECURITY
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegate_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegates ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Permisos de API para usuarios con sesion. Las policies de abajo filtran filas.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users, user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON places, place_amenities TO authenticated;
GRANT SELECT ON place_hours, place_issues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reservations, reviews, place_reports, favorites, messages TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON support_tickets, support_ticket_messages TO authenticated;
GRANT SELECT ON delegates, delegate_places TO authenticated;

-- Perfil publico del usuario autenticado.
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id);

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

-- Reservas propias.
CREATE POLICY reservations_select_own ON reservations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY reservations_insert_own ON reservations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY reservations_update_own_pending ON reservations
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id);

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
CREATE POLICY place_reports_select_own_or_public_pending ON place_reports
    FOR SELECT USING (auth.uid() = user_id OR status IN ('pending', 'reviewing', 'resolved'));

CREATE POLICY place_reports_insert_own ON place_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY place_reports_update_own_pending ON place_reports
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY place_issues_select_all ON place_issues
    FOR SELECT USING (true);

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

CREATE POLICY delegate_places_select_own ON delegate_places
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM delegates
            WHERE delegates.id = delegate_places.delegate_id
            AND delegates.user_id = auth.uid()
        )
    );

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

COMMIT;
