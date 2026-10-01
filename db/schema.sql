-- Esquema de HealthByte. Idempotente: el API lo ejecuta en cada arranque (api/src/db.ts, migrar()).

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'healthbyte_app') THEN
    CREATE ROLE healthbyte_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;
GRANT healthbyte_app TO CURRENT_USER;

CREATE TABLE IF NOT EXISTS clinica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nombre text NOT NULL,
  plan text NOT NULL DEFAULT 'estandar'
);
CREATE TABLE IF NOT EXISTS quirofano (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica,
  nombre text NOT NULL
);
CREATE TABLE IF NOT EXISTS usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica,
  nombre text NOT NULL,
  rol text NOT NULL,
  login text NOT NULL,
  hash_clave text NOT NULL,
  UNIQUE (clinica_id, login)
);
CREATE TABLE IF NOT EXISTS protocolo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica,
  especialidad text NOT NULL,
  definicion jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS paciente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica,
  nombre text NOT NULL,
  tipo_doc text NOT NULL,
  num_doc text NOT NULL,
  fecha_nacimiento date NOT NULL,
  eps text NOT NULL,
  hc text NOT NULL
);
CREATE TABLE IF NOT EXISTS cirugia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica,
  quirofano_id uuid NOT NULL REFERENCES quirofano,
  paciente_id uuid NOT NULL REFERENCES paciente,
  protocolo_id uuid NOT NULL REFERENCES protocolo,
  fecha_programada timestamptz NOT NULL,
  procedimiento text NOT NULL,
  diagnostico text NOT NULL,
  lateralidad text NOT NULL,
  equipo_programado jsonb NOT NULL,
  datos_preop jsonb NOT NULL,
  archivada boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS evento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica,
  cirugia_id uuid NOT NULL REFERENCES cirugia,
  ts timestamptz NOT NULL DEFAULT clock_timestamp(),
  tipo text NOT NULL,
  datos jsonb NOT NULL,
  registrado_por uuid REFERENCES usuario,
  rol_confirma text,
  origen text NOT NULL CHECK (origen IN ('voz', 'manual', 'camara')), -- camara: lo propuso la cámara y alguien lo confirmó
  texto text,
  confianza real,
  anula_evento_id uuid REFERENCES evento
);
CREATE INDEX IF NOT EXISTS evento_por_cirugia ON evento (cirugia_id, ts);
-- Las bases creadas antes de la cámara de la mesa solo admitían 'voz' y 'manual'.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'evento_origen_check' AND pg_get_constraintdef(oid) LIKE '%camara%') THEN
    ALTER TABLE evento DROP CONSTRAINT IF EXISTS evento_origen_check;
    ALTER TABLE evento ADD CONSTRAINT evento_origen_check CHECK (origen IN ('voz', 'manual', 'camara'));
  END IF;
END $$;
-- Catálogo de la hoja de consumo de cada clínica. Sin precios: los costos los maneja la clínica en otro proceso.
CREATE TABLE IF NOT EXISTS insumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica,
  nombre text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('general', 'sutura', 'otro', 'equipo')),
  UNIQUE (clinica_id, nombre)
);
-- Catálogo de instrumental de cada clínica: corrige los nombres que el reconocimiento de voz transcribe mal.
CREATE TABLE IF NOT EXISTS instrumento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica,
  codigo text NOT NULL,
  nombre text NOT NULL,
  categoria text NOT NULL,
  UNIQUE (clinica_id, codigo)
);
-- Cada foto que analizó la cámara de la mesa, con lo que vio. Inmutable como evento: es evidencia para la trazabilidad
-- y la base para analizar después cuánto coincide la cámara con el conteo dictado.
-- ponytail: la imagen va en bytea (unos cientos de KB por foto); pasarla a Cloud Storage si el volumen crece.
CREATE TABLE IF NOT EXISTS captura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica,
  cirugia_id uuid NOT NULL REFERENCES cirugia,
  ts timestamptz NOT NULL DEFAULT clock_timestamp(),
  modo text NOT NULL CHECK (modo IN ('conteo', 'esterilizacion')),
  imagen bytea NOT NULL,
  resultado jsonb NOT NULL,
  pedida_por uuid REFERENCES usuario,
  dispositivo text NOT NULL
);
CREATE INDEX IF NOT EXISTS captura_por_cirugia ON captura (cirugia_id, ts);

-- Cada tabla con datos de una clínica solo muestra las filas de la clínica fijada en la transacción.
-- El API ejecuta SET LOCAL ROLE healthbyte_app (que no es dueño de las tablas), así que la política siempre aplica.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['quirofano', 'usuario', 'protocolo', 'paciente', 'cirugia', 'evento', 'insumo', 'instrumento', 'captura'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS por_clinica ON %I', t);
    EXECUTE format($p$CREATE POLICY por_clinica ON %I
      USING (clinica_id = current_setting('app.clinica_id', true)::uuid)
      WITH CHECK (clinica_id = current_setting('app.clinica_id', true)::uuid)$p$, t);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO healthbyte_app;
GRANT SELECT ON clinica, quirofano, usuario, protocolo, paciente, cirugia, evento, insumo, instrumento, captura TO healthbyte_app;
GRANT INSERT ON evento, captura TO healthbyte_app; -- sin UPDATE ni DELETE: los eventos y las fotos son inmutables
