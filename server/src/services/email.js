export async function sendEmail({ to, subject, html }) {
  if (!to) {
    throw new Error('Email recipient is required');
  }

  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.log('[email-placeholder]', { to, subject, htmlPreview: html.slice(0, 80) });
    return { mocked: true };
  }

  // Placeholder for Brevo integration once key is provided.
  console.log('[email-brevo-configured] Ready to send real email', { to, subject });
  return { mocked: false };
}
