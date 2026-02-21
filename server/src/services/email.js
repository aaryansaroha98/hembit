function normalizeRecipients(to) {
  if (!to) {
    return [];
  }

  const list = Array.isArray(to) ? to : [to];
  const unique = new Map();

  for (const value of list) {
    const email = String(value || '').trim();
    if (!email) {
      continue;
    }
    unique.set(email.toLowerCase(), email);
  }

  return Array.from(unique.values());
}

export async function sendEmail({ to, subject, html }) {
  const recipients = normalizeRecipients(to);

  if (!recipients.length) {
    throw new Error('Email recipient is required');
  }
  if (!subject || !String(subject).trim()) {
    throw new Error('Email subject is required');
  }

  const key = String(process.env.BREVO_API_KEY || '').trim();
  const content = String(html || '').trim();

  if (!key) {
    console.log('[email-placeholder]', {
      to: recipients,
      subject,
      htmlPreview: content.slice(0, 80),
    });
    return { mocked: true };
  }

  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || 'no-reply@hembit.in').trim();
  const senderName = String(process.env.BREVO_SENDER_NAME || 'HEMBIT').trim();

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': key,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: recipients.map((email) => ({ email })),
      subject: String(subject),
      htmlContent: content || '<p>No message content</p>',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo send failed (${response.status}): ${errorText.slice(0, 240)}`);
  }

  const payload = await response.json().catch(() => ({}));
  return { mocked: false, payload };
}
