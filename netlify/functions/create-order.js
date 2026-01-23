const { randomUUID } = require('crypto');

const {
  MP_ACCESS_TOKEN,
  STORE_EMAIL,
  GITHUB_TOKEN,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH
} = process.env;

function getRepoConfig() {
  const branch = GITHUB_BRANCH || 'main';
  if (!GITHUB_TOKEN) {
    throw new Error('Missing GITHUB_TOKEN for order storage.');
  }

  if (GITHUB_REPO && GITHUB_REPO.includes('/')) {
    const [owner, repo] = GITHUB_REPO.split('/');
    return { owner, repo, branch };
  }

  if (!GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error('Missing GITHUB_OWNER/GITHUB_REPO for order storage.');
  }

  return { owner: GITHUB_OWNER, repo: GITHUB_REPO, branch };
}

function getBaseUrl(event) {
  const envUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
  if (envUrl) return envUrl;
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  const protocol = event.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}`;
}

async function githubPutFile({ path, content, message }) {
  const { owner, repo, branch } = getRepoConfig();
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        branch
      })
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to store order.');
  }
}

async function createMercadoPagoPreference({ items, orderId, baseUrl }) {
  if (!MP_ACCESS_TOKEN) {
    throw new Error('Missing MP_ACCESS_TOKEN.');
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: Number(item.price)
      })),
      external_reference: orderId,
      back_urls: {
        success: `${baseUrl}/success.html?order_id=${orderId}`,
        failure: `${baseUrl}/?payment=failed`,
        pending: `${baseUrl}/?payment=pending`
      },
      auto_return: 'approved',
      notification_url: `${baseUrl}/.netlify/functions/mp-webhook`,
      metadata: { order_id: orderId }
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to create Mercado Pago preference.');
  }

  return response.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Cart is empty.' }) };
    }

    const orderId = randomUUID();
    const total = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    const baseUrl = getBaseUrl(event);

    const order = {
      id: orderId,
      status: 'created',
      created_at: new Date().toISOString(),
      total,
      currency: 'EUR',
      customer: {
        email: payload.customer?.email || ''
      },
      items: items.map((item) => ({
        id: String(item.id),
        title: item.title,
        price: Number(item.price),
        quantity: Number(item.quantity)
      }))
    };

    await githubPutFile({
      path: `orders/${orderId}.json`,
      content: JSON.stringify(order, null, 2),
      message: `chore: create order ${orderId}`
    });

    const preference = await createMercadoPagoPreference({
      items: order.items,
      orderId,
      baseUrl
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        order_id: orderId,
        checkout_url: preference.init_point || preference.sandbox_init_point
      })
    };
  } catch (error) {
    console.error('Create order error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: error.message || 'Server error.' })
    };
  }
};
