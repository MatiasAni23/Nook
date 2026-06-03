-- =============================================
-- NOOK / STUDYCONNECT - Database Schema
-- Sistema de gestión de espacios de estudio y trabajo
-- =============================================

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
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'worker', 'admin', 'support', 'delegate')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'verified', 'suspended', 'blocked', 'pending')),
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

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
    is_independent BOOLEAN DEFAULT FALSE,
    industry VARCHAR(255), -- Rubro para independientes

    -- Campos comunes
    bio TEXT,
    profile_image_url TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id)
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_region_id ON user_profiles(region_id);
CREATE INDEX idx_user_profiles_city_id ON user_profiles(city_id);
CREATE INDEX idx_user_profiles_institution_id ON user_profiles(institution_id);

-- =============================================
-- STORAGE: profile-images
-- Imagenes de perfil guardadas en Supabase Storage
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Profile images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;

CREATE POLICY "Profile images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- TABLA: delegates
-- Delegados que administran lugares
-- =============================================
CREATE TABLE delegates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'suspended', 'pending')),
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    category VARCHAR(20) NOT NULL CHECK (category IN ('study', 'work')), -- Para estudiantes o trabajadores
    description TEXT,
    address VARCHAR(500) NOT NULL,

    -- Ubicación
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    zone VARCHAR(100), -- Ej: Providencia, Las Condes, etc.

    -- Rating y estadísticas
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    reviews_count INTEGER DEFAULT 0,
    visits_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,

    -- Capacidad y horarios
    capacity_min INTEGER,
    capacity_max INTEGER,
    hours VARCHAR(100), -- Ej: "8:00 - 22:00"

    -- Precios (para lugares de trabajo)
    price_per_hour DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'CLP',

    -- Servicios y ambiente
    wifi BOOLEAN DEFAULT FALSE,
    outlets BOOLEAN DEFAULT FALSE,
    parking BOOLEAN DEFAULT FALSE,
    quietness_level INTEGER CHECK (quietness_level >= 1 AND quietness_level <= 5),
    lighting_level INTEGER CHECK (lighting_level >= 1 AND lighting_level <= 5),

    -- Estado y visibilidad
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'deleted')),
    verified BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,

    -- Imágenes
    images TEXT[], -- Array de URLs de imágenes

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_places_type ON places(type);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_status ON places(status);
CREATE INDEX idx_places_zone ON places(zone);
CREATE INDEX idx_places_location ON places(latitude, longitude);
CREATE INDEX idx_places_rating ON places(rating DESC);

-- =============================================
-- TABLA: delegate_places
-- Relación entre delegados y lugares asignados
-- =============================================
CREATE TABLE delegate_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegate_id UUID REFERENCES delegates(id) ON DELETE CASCADE,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Domingo, 6 = Sábado
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,

    UNIQUE(place_id, day_of_week)
);

CREATE INDEX idx_place_hours_place ON place_hours(place_id);

-- =============================================
-- TABLA: place_amenities
-- Servicios y comodidades de cada lugar
-- =============================================
CREATE TABLE place_amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    amenity_key VARCHAR(50) NOT NULL, -- Ej: 'meeting_room', 'coffee', 'printer', etc.
    amenity_name VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    additional_info TEXT,

    UNIQUE(place_id, amenity_key)
);

CREATE INDEX idx_place_amenities_place ON place_amenities(place_id);

-- =============================================
-- TABLA: reservations
-- Reservas de espacios de trabajo
-- =============================================
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,

    -- Fechas y horarios
    reservation_dates DATE[] NOT NULL, -- Array de fechas reservadas
    start_time TIME,
    end_time TIME,

    -- Estado y pago
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CLP',
    payment_method VARCHAR(50), -- Ej: 'credit_card', 'transfer', 'onepay'
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),

    -- Información adicional
    guests_count INTEGER DEFAULT 1,
    special_requests TEXT,

    -- Cancelación
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_place ON reservations(place_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_dates ON reservations USING GIN(reservation_dates);

-- =============================================
-- TABLA: reviews
-- Reseñas y valoraciones de lugares
-- =============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,

    -- Ratings específicos
    wifi_rating INTEGER CHECK (wifi_rating >= 1 AND wifi_rating <= 5),
    noise_rating INTEGER CHECK (noise_rating >= 1 AND noise_rating <= 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),

    helpful_count INTEGER DEFAULT 0,
    verified_visit BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL CHECK (type IN ('no_wifi', 'crowded', 'noisy', 'no_outlets', 'closed', 'dirty', 'no_parking', 'other')),
    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),

    upvotes_count INTEGER DEFAULT 0,

    -- Moderación
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    admin_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    reported_by UUID REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upvotes INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP
);

CREATE INDEX idx_place_issues_place ON place_issues(place_id);
CREATE INDEX idx_place_issues_timestamp ON place_issues(timestamp DESC);

-- =============================================
-- TABLA: favorites
-- Lugares favoritos de cada usuario
-- =============================================
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,

    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    -- Tipo de mensaje (para futuras extensiones)
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location')),
    attachment_url TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_receiver BOOLEAN DEFAULT FALSE
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
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL CHECK (type IN ('issue_report', 'favorite_issue', 'reservation_confirmed', 'new_message', 'place_update', 'review_response', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Referencias opcionales
    place_id UUID REFERENCES places(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);

-- =============================================
-- TABLA: support_tickets
-- Tickets de soporte
-- =============================================
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('technical', 'billing', 'report', 'suggestion', 'other')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'closed')),

    -- Asignación
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP,

    -- Seguimiento
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,

    -- Metadata
    tags TEXT[],
    internal_notes TEXT
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);

-- =============================================
-- TABLA: support_ticket_messages
-- Mensajes dentro de tickets de soporte
-- =============================================
CREATE TABLE support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'support', 'system')),

    message TEXT NOT NULL,
    attachments TEXT[], -- URLs de archivos adjuntos

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    is_internal BOOLEAN DEFAULT FALSE -- Notas internas solo para staff
);

CREATE INDEX idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_sender ON support_ticket_messages(sender_id);
CREATE INDEX idx_support_ticket_messages_created ON support_ticket_messages(created_at);

-- =============================================
-- VISTAS ÚTILES
-- =============================================

-- Vista de lugares con estadísticas completas
CREATE OR REPLACE VIEW places_with_stats AS
SELECT
    p.*,
    COUNT(DISTINCT r.id) as total_reservations,
    COUNT(DISTINCT f.id) as favorites_count,
    COUNT(DISTINCT pr.id) as active_reports_count,
    COALESCE(AVG(rev.rating), 0) as avg_rating
FROM places p
LEFT JOIN reservations r ON p.id = r.place_id
LEFT JOIN favorites f ON p.id = f.place_id
LEFT JOIN place_reports pr ON p.id = pr.place_id AND pr.status IN ('pending', 'reviewing')
LEFT JOIN reviews rev ON p.id = rev.place_id
GROUP BY p.id;

-- Vista de usuarios con estadísticas
CREATE OR REPLACE VIEW users_with_stats AS
SELECT
    u.*,
    COUNT(DISTINCT r.id) as total_reservations,
    COUNT(DISTINCT pr.id) as total_reports,
    COUNT(DISTINCT rev.id) as total_reviews,
    COUNT(DISTINCT f.id) as total_favorites
FROM users u
LEFT JOIN reservations r ON u.id = r.user_id
LEFT JOIN place_reports pr ON u.id = pr.user_id
LEFT JOIN reviews rev ON u.id = rev.user_id
LEFT JOIN favorites f ON u.id = f.user_id
WHERE u.role IN ('student', 'worker')
GROUP BY u.id;

-- Vista de delegados con lugares asignados
CREATE OR REPLACE VIEW delegates_with_places AS
SELECT
    d.*,
    u.name,
    u.email,
    u.phone,
    COUNT(dp.place_id) as places_count,
    ARRAY_AGG(dp.place_id) as assigned_place_ids
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
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON places
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_place_reports_updated_at BEFORE UPDATE ON place_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar el rating de un lugar
CREATE OR REPLACE FUNCTION update_place_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE places
    SET
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE place_id = NEW.place_id
        ),
        reviews_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE place_id = NEW.place_id
        )
    WHERE id = NEW.place_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_place_rating_on_review AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_place_rating();

-- Función para actualizar contador de favoritos
CREATE OR REPLACE FUNCTION update_place_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE places
        SET favorites_count = favorites_count + 1
        WHERE id = NEW.place_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE places
        SET favorites_count = GREATEST(favorites_count - 1, 0)
        WHERE id = OLD.place_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_favorites_count AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_place_favorites_count();

-- =============================================
-- DATOS DE EJEMPLO / SEED DATA
-- =============================================

-- Insertar usuario admin por defecto
INSERT INTO users (email, password_hash, name, role, status, profile_completed, email_verified)
VALUES ('admin@nook.cl', '$2b$10$dummy_hash_here', 'Administrador', 'admin', 'verified', TRUE, TRUE);

-- Insertar usuarios demo
INSERT INTO users (email, password_hash, name, role, status, profile_completed, email_verified)
VALUES
    ('estudiante@demo.cl', '$2b$10$dummy_hash_here', 'Estudiante Demo', 'student', 'verified', TRUE, TRUE),
    ('trabajador@demo.cl', '$2b$10$dummy_hash_here', 'Trabajador Demo', 'worker', 'verified', TRUE, TRUE);

-- =============================================
-- COMENTARIOS ADICIONALES
-- =============================================

COMMENT ON TABLE users IS 'Usuarios del sistema con roles: student, worker, admin, support, delegate';
COMMENT ON TABLE places IS 'Lugares de estudio y trabajo';
COMMENT ON TABLE reservations IS 'Reservas de espacios de trabajo';
COMMENT ON TABLE place_reports IS 'Reportes tipo Waze sobre problemas en lugares';
COMMENT ON TABLE support_tickets IS 'Sistema de soporte con tickets';
COMMENT ON TABLE messages IS 'Sistema de mensajería entre usuarios';
COMMENT ON TABLE notifications IS 'Notificaciones push para usuarios';
COMMENT ON TABLE delegates IS 'Delegados que administran lugares específicos';

-- =============================================
-- FIN DEL SCHEMA
-- =============================================
