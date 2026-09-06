const BASE = 'http://localhost:3001';

export async function createUser(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: 'Test',
      lastName: 'User',
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Failed to create user: ${res.status} ${JSON.stringify(body)}`);
  }

  return res.json() as Promise<{ user: { id: string; email: string } }>;
}

export async function createAdmin(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: 'Admin',
      lastName: 'User',
      role: 'admin',
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Failed to create admin: ${res.status} ${JSON.stringify(body)}`);
  }

  return res.json() as Promise<{ user: { id: string; email: string } }>;
}
