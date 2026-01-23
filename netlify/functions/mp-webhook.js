const crypto = require('crypto');
const nodemailer = require('nodemailer');

const {
  MP_ACCESS_TOKEN,
  MP_WEBHOOK_SECRET,
  STORE_EMAIL,
  GITHUB_TOKEN,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH,
  EMAIL_SMTP_HOST,
  EMAIL_SMTP_PORT,
  EMAIL_SMTP_USER,
  EMAIL_SMTP_PASS,
  EMAIL_SMTP_FROM
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

function verifySignature({ signatureHeader, body, secret }) {
  if (!secret) return true;
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(',');
  const timestamp = parts.find((part) => part.trim().startsWith('ts='))?.split('=')[1];
  const signature = parts.find((part) => part.trim().startsWith('v1='))?.split('=')[1];
  if (!timestamp || !signature) return false;

  const payload = `${timestamp}.${body}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function fetchPayment(paymentId) {
  if (!MP_ACCESS_TOKEN) {
    throw new Error('Missing MP_ACCESS_TOKEN.');
  }
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`
    }
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to fetch payment.');
  }
  return response.json();
}

async function githubGetFile(path) {
  const { owner, repo, branch } = getRepoConfig();
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    }
  );
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to fetch order.');
  }
  const data = await response.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { sha: data.sha, order: JSON.parse(content) };
}

async function githubUpdateFile({ path, content, message, sha }) {
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
        branch,
        sha
      })
    }
  );
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to update order.');
  }
}

async function sendEmail({ to, subject, text }) {
  if (!EMAIL_SMTP_HOST || !EMAIL_SMTP_PORT || !EMAIL_SMTP_USER || !EMAIL_SMTP_PASS) {
    console.warn('SMTP env vars missing; skipping email.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_SMTP_HOST,
    port: Number(EMAIL_SMTP_PORT),
    secure: Number(EMAIL_SMTP_PORT) === 465,
    auth: {
      user: EMAIL_SMTP_USER,
      pass: EMAIL_SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: EMAIL_SMTP_FROM || STORE_EMAIL || EMAIL_SMTP_USER,
    to,
    subject,
    text
  });
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

  const signatureHeader = event.headers['x-signature'] || event.headers['X-Signature'];
  const body = event.body || '';
  const isValid = verifySignature({
    signatureHeader,
    body,
    secret: MP_WEBHOOK_SECRET
  });

  if (!isValid) {
    return { statusCode: 401, body: 'Invalid signature.' };
  }

  try {
    const payload = JSON.parse(body || '{}');
    const paymentId = payload.data?.id || payload.id;
    if (!paymentId) {
      return { statusCode: 200, body: 'No payment id.' };
    }

    const payment = await fetchPayment(paymentId);
    if (payment.status !== 'approved') {
      return { statusCode: 200, body: 'Payment not approved.' };
    }

    const orderId = payment.external_reference;
    if (!orderId) {
      return { statusCode: 200, body: 'No order id.' };
    }

    const { sha, order } = await githubGetFile(`orders/${orderId}.json`);
    const updated = {
      ...order,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.transaction_amount,
        method: payment.payment_method_id
      }
    };

    await githubUpdateFile({
      path: `orders/${orderId}.json`,
      content: JSON.stringify(updated, null, 2),
      message: `chore: mark order ${orderId} as paid`,
      sha
    });

    if (order.customer?.email) {
      await sendEmail({
        to: order.customer.email,
        subject: 'Pago confirmado - nude',
        text: `¡Gracias por tu compra! Tu pedido ${orderId} fue confirmado.`
      });
    }

    if (STORE_EMAIL) {
      await sendEmail({
        to: STORE_EMAIL,
        subject: `Nuevo pedido pagado ${orderId}`,
        text: `El pedido ${orderId} está pagado y listo para preparar.`
      });
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Webhook error:', error);
    return { statusCode: 500, body: 'Webhook error.' };
  }
};
