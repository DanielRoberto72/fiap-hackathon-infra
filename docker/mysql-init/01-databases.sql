-- Each microservice keeps its own database (logical isolation, polyglot persistence rule).
CREATE DATABASE IF NOT EXISTS fiap_hackathon_upload
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fiap_hackathon_report
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fiap_hackathon_auth
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON fiap_hackathon_upload.* TO 'hackathon'@'%';
GRANT ALL PRIVILEGES ON fiap_hackathon_report.* TO 'hackathon'@'%';
GRANT ALL PRIVILEGES ON fiap_hackathon_auth.* TO 'hackathon'@'%';

FLUSH PRIVILEGES;

-- Tabela `users` espelha o schema do lambda-auth (prisma/schema.prisma).
-- Criada no init para evitar dependência de prisma migrate em runtime local.
USE fiap_hackathon_auth;

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  scopes        VARCHAR(500) NOT NULL DEFAULT 'upload:write,report:read',
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
