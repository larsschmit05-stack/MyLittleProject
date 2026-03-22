/**
 * Brevo API Client for sending emails
 * https://www.brevo.com/
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_BASE = 'https://api.brevo.com/v3';
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'invites@mylittleproject.app';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'MyLittleProject';

export interface BrevoEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  from?: { email: string; name?: string };
}

/**
 * Send an email via Brevo API
 */
export async function sendBrevoEmail(params: BrevoEmailParams): Promise<{ messageId: string }> {
  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
      textContent: params.textContent,
      sender: params.from || { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Brevo API error: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return { messageId: data.messageId };
}
