import assert from 'node:assert/strict';
const base = process.env.CRM_TEST_URL;
if (!base) throw new Error('Set CRM_TEST_URL to the deployed site URL');
let checks = 0;
async function request(path, method = 'GET', body, cookie = '') {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: { Origin: base, 'Content-Type': 'application/json', Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie') };
}
function status(result, expected) {
  assert.equal(result.status, expected, JSON.stringify(result.data));
  checks++;
}
assert.equal((await fetch(base)).status, 200); checks++;
status(await request('clients'), 401);
for (const [role, email] of [['Client', 'client@mini-crm.test'], ['Employee', 'employee@mini-crm.test'], ['Admin', 'admin@mini-crm.test']]) {
  const login = await request('auth/login', 'POST', { email, password: 'CrmDemo!2026' });
  status(login, 200);
  assert.equal(login.data.user.role, role); checks++;
  assert.match(login.cookie, /HttpOnly/i);
  assert.match(login.cookie, /Secure/i); checks += 2;
  const cookie = login.cookie.split(';')[0];
  try {
    status(await request('auth/me', 'GET', undefined, cookie), 200);
    const dashboard = await request('dashboard', 'GET', undefined, cookie);
    status(dashboard, 200);
    status(await request('clients', 'GET', undefined, cookie), role === 'Client' ? 403 : 200);
    status(await request('users', 'GET', undefined, cookie), role === 'Admin' ? 200 : 403);
    if (role === 'Admin') {
      assert.ok(dashboard.data.users.every(row => typeof row.count === 'number')); checks++;
      status(await request('clients?q=smirnov', 'GET', undefined, cookie), 200);
    }
  } finally {
    status(await request('auth/logout', 'POST', {}, cookie), 200);
    status(await request('auth/me', 'GET', undefined, cookie), 401);
  }
}
console.log(`PASS: ${checks} deployed site, login and permission checks`);
