export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidFileError extends DomainError {
  constructor(detail: string, details?: Record<string, unknown>) {
    super(`Invalid file: ${detail}`, 'INVALID_FILE', 400, details);
  }
}

export class FileTooLargeError extends DomainError {
  constructor(actualBytes: number, maxBytes: number) {
    super(
      `File exceeds maximum allowed size: ${actualBytes} > ${maxBytes} bytes`,
      'FILE_TOO_LARGE',
      413,
      { actualBytes, maxBytes },
    );
  }
}

export class UnsupportedMimeTypeError extends DomainError {
  constructor(actual: string, allowed: readonly string[]) {
    super(`Unsupported mimetype: ${actual}`, 'UNSUPPORTED_MIMETYPE', 415, { actual, allowed });
  }
}

export class MalwareDetectedError extends DomainError {
  constructor(scannerSignature: string) {
    super('Malware detected by ClamAV', 'MALWARE_DETECTED', 400, { scannerSignature });
  }
}

export class AnalysisNotFoundError extends DomainError {
  constructor(analysisId: string) {
    super(`Analysis not found: ${analysisId}`, 'ANALYSIS_NOT_FOUND', 404, { analysisId });
  }
}

export class ReportNotFoundError extends DomainError {
  constructor(reportId: string) {
    super(`Report not found: ${reportId}`, 'REPORT_NOT_FOUND', 404, { reportId });
  }
}

export class IdempotencyConflictError extends DomainError {
  constructor(idempotencyKey: string) {
    super(
      `Idempotency key already used with a different request body: ${idempotencyKey}`,
      'IDEMPOTENCY_CONFLICT',
      409,
      { idempotencyKey },
    );
  }
}

export class ExternalServiceError extends DomainError {
  constructor(service: string, detail: string, cause?: unknown) {
    super(
      `External service error from ${service}: ${detail}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { service, cause: cause instanceof Error ? cause.message : String(cause) },
    );
  }
}
