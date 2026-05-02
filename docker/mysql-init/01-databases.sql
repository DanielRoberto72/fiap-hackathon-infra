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
