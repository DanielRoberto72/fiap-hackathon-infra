import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';

// O bootstrap do LocalStack cria a HTTP API com custom id "fiapauth" e stage "local".
// O fluxo bate direto no API Gateway emulado: o BFF nao expoe /auth/* em REST,
// quem expoe sao as Lambdas via apigatewayv2 emulado pelo LocalStack.
const AUTH = process.env.AUTH_BASE_URL ?? 'http://localhost:4566/_aws/execute-api/fiapauth/local';

describe('FIAP Hackathon — autenticacao via Lambda + API Gateway (LocalStack)', () => {
  let client: AxiosInstance;

  beforeAll(() => {
    client = axios.create({
      baseURL: AUTH,
      validateStatus: () => true,
      timeout: 15_000,
    });
  });

  it('register cria usuario novo e login devolve token JWT', async () => {
    const email = `daniel+${randomUUID()}@fiap.com`;
    const password = 'Hackathon123!';

    const registerRes = await client.post('/auth/register', { email, password });
    expect([200, 201]).toContain(registerRes.status);
    expect(registerRes.data).toHaveProperty('userId');

    const loginRes = await client.post('/auth/login', { email, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.data).toHaveProperty('accessToken');
    expect(typeof loginRes.data.accessToken).toBe('string');
    expect(loginRes.data.accessToken.split('.')).toHaveLength(3); // JWT
  });

  it('login com senha errada retorna 401', async () => {
    const email = `wrong+${randomUUID()}@fiap.com`;

    await client.post('/auth/register', { email, password: 'Correta123!' });
    const loginRes = await client.post('/auth/login', { email, password: 'errada456!' });

    expect(loginRes.status).toBe(401);
  });

  it('register com email duplicado retorna 409', async () => {
    const email = `dup+${randomUUID()}@fiap.com`;

    const first = await client.post('/auth/register', { email, password: 'Senha123!' });
    expect([200, 201]).toContain(first.status);

    const second = await client.post('/auth/register', { email, password: 'Outra456!' });
    expect(second.status).toBe(409);
  });
});
