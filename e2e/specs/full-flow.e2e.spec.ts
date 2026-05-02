import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { randomUUID } from 'crypto';

const BFF = process.env.BFF_BASE_URL ?? 'http://localhost:3000';
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_MS = 45_000;

// PNG mínimo válido (1x1 preto). Magic bytes corretos para o file-type passar.
const MIN_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d49444154789c63000100000005000100' +
    '5e8be8b30000000049454e44ae426082',
  'hex',
);

describe('FIAP Hackathon — fluxo end-to-end', () => {
  let client: AxiosInstance;

  beforeAll(() => {
    client = axios.create({
      baseURL: BFF,
      validateStatus: () => true,
      timeout: 10_000,
    });
  });

  it('upload → processing → report (mock provider, sem custo de IA real)', async () => {
    const idempotencyKey = randomUUID();
    const fd = new FormData();
    fd.append('file', MIN_PNG, { filename: 'arch-diagram.png', contentType: 'image/png' });

    const uploadRes = await client.post('/api/analyses', fd, {
      headers: { ...fd.getHeaders(), 'Idempotency-Key': idempotencyKey },
    });
    expect(uploadRes.status).toBe(202);
    expect(uploadRes.data).toHaveProperty('analysisId');
    expect(uploadRes.data.status).toBe('RECEIVED');
    const { analysisId } = uploadRes.data as { analysisId: string };

    const finalReport = await pollUntilReport(client, analysisId, POLL_MAX_MS);

    expect(finalReport.status).toBe('ANALYZED');
    expect(finalReport.componentsCount).toBeGreaterThan(0);
    expect(finalReport.risksCount).toBeGreaterThan(0);
    expect(finalReport.recommendationsCount).toBeGreaterThan(0);
    expect(finalReport.providerChain.step1).toMatch(/mock|gemini/);
    expect(finalReport.providerChain.step2).toMatch(/mock|groq/);
  });

  it('upload com mesma Idempotency-Key retorna o mesmo analysisId', async () => {
    const key = randomUUID();
    const make = () => {
      const fd = new FormData();
      fd.append('file', MIN_PNG, { filename: 'arch-idem.png', contentType: 'image/png' });
      return fd;
    };

    const a = await client.post('/api/analyses', make(), {
      headers: { ...make().getHeaders(), 'Idempotency-Key': key },
    });
    const b = await client.post('/api/analyses', make(), {
      headers: { ...make().getHeaders(), 'Idempotency-Key': key },
    });

    expect(a.status).toBe(202);
    expect(b.status).toBe(202);
    expect(a.data.analysisId).toBe(b.data.analysisId);
    expect(b.data.alreadyExisted).toBe(true);
  });
});

async function pollUntilReport(
  client: AxiosInstance,
  analysisId: string,
  maxMs: number,
): Promise<{
  status: string;
  componentsCount: number;
  risksCount: number;
  recommendationsCount: number;
  providerChain: { step1: string; step2: string };
}> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const res = await client.get(`/api/reports/${analysisId}`);
    if (res.status === 200) {
      return res.data;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Report not produced for analysisId=${analysisId} in ${maxMs}ms`);
}
