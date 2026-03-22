import { sendBrevoEmail } from './brevoClient';

export interface SendInviteEmailParams {
  inviteeEmail: string;
  inviterName: string;
  modelName: string;
  role: 'view' | 'edit';
  inviteLink: string;
}

/**
 * Send an invitation email via Brevo
 */
export async function sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
  const { inviteeEmail, inviterName, modelName, role, inviteLink } = params;

  const roleText = role === 'edit' ? 'edit' : 'view only';
  const expiryDays = 30;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; margin-bottom: 16px;">You're invited to collaborate on a model</h2>
      
      <p style="color: #666; line-height: 1.6; margin-bottom: 16px;">
        <strong>${inviterName}</strong> invited you to collaborate on the model <strong>"${modelName}"</strong>.
      </p>
      
      <div style="background: #f5f5f5; padding: 16px; border-left: 4px solid #007bff; margin: 24px 0;">
        <p style="color: #666; margin: 0; font-size: 14px;">
          <strong>Your access level:</strong> ${roleText}
        </p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteLink}" style="
          background: #007bff;
          color: white;
          padding: 12px 32px;
          text-decoration: none;
          border-radius: 4px;
          display: inline-block;
          font-weight: 500;
        ">
          Accept Invitation
        </a>
      </div>
      
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 32px;">
        This invitation will expire in ${expiryDays} days.
      </p>
      
      <p style="color: #999; font-size: 12px; margin-top: 16px;">
        If you don't recognize this invite, you can safely ignore this email.
      </p>
    </div>
  `;

  const textContent = `
You're invited to collaborate on "${modelName}"

${inviterName} invited you to collaborate on the model "${modelName}".

Your access level: ${roleText}

Accept invitation: ${inviteLink}

This invitation will expire in ${expiryDays} days.

If you don't recognize this invite, you can safely ignore this email.
  `.trim();

  try {
    await sendBrevoEmail({
      to: [{ email: inviteeEmail }],
      subject: `You're invited to collaborate on "${modelName}"`,
      htmlContent,
      textContent,
    });
  } catch (error) {
    console.error('Failed to send invite email:', error);
    throw error;
  }
}
