interface InviteEmailParams {
  inviterName: string;
  modelName: string;
  role: 'edit' | 'view';
  inviteLink: string;
  expiresInDays: number;
}

const roleLabels: Record<string, string> = {
  edit: 'Edit',
  view: 'View only',
};

export function generateInviteEmailHtml(params: InviteEmailParams): string {
  const { inviterName, modelName, role, inviteLink, expiresInDays } = params;
  const roleLabel = roleLabels[role] ?? role;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">You've been invited to collaborate</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.5;">
            <strong>${escapeHtml(inviterName)}</strong> has invited you to access the model
            <strong>"${escapeHtml(modelName)}"</strong> with <strong>${roleLabel}</strong> permissions.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;" align="center">
          <a href="${escapeHtml(inviteLink)}"
             style="display:inline-block;padding:12px 32px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:500;">
            Accept Invite
          </a>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.5;">
            This invitation expires in ${expiresInDays} days. If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:#2563eb;word-break:break-all;">
            ${escapeHtml(inviteLink)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function generateInviteEmailText(params: InviteEmailParams): string {
  const { inviterName, modelName, role, inviteLink, expiresInDays } = params;
  const roleLabel = roleLabels[role] ?? role;

  return [
    `You've been invited to collaborate`,
    ``,
    `${inviterName} has invited you to access the model "${modelName}" with ${roleLabel} permissions.`,
    ``,
    `Accept the invite by visiting:`,
    inviteLink,
    ``,
    `This invitation expires in ${expiresInDays} days.`,
  ].join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
