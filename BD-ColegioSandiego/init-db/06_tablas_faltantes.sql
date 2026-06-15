CREATE TABLE IF NOT EXISTS token_revocado (
    id BIGSERIAL PRIMARY KEY,
    jti VARCHAR(36) UNIQUE NOT NULL,
    usuario_id INT REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    revocado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS usuario_permiso_modulo (
    permiso_id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    modulo VARCHAR(30) NOT NULL,
    nivel VARCHAR(10) NOT NULL DEFAULT 'lectura',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (usuario_id, modulo)
);
