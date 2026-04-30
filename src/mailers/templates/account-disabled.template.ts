/**
 * Generates the HTML email body sent to a user when their account is disabled.
 */
export function buildAccountDisabledEmail(params: {
	userName: string;
	reason: string;
	disabledAt: Date;
	status: "BLOCKED" | "LIMITED";
}): { subject: string; html: string } {
	const { userName, reason, disabledAt, status } = params;

	const formattedDate = disabledAt.toLocaleString("en-GB", {
		timeZone: "UTC",
		day: "2-digit",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const statusLabel =
		status === "BLOCKED" ? "blocked" : "limited";

	const subject = `Your account has been ${statusLabel}`;

	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #c0392b; padding: 32px 40px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .body { padding: 32px 40px; color: #333; line-height: 1.6; }
    .reason-box { background: #fdf3f2; border-left: 4px solid #c0392b; padding: 16px 20px; margin: 24px 0; border-radius: 4px; }
    .reason-box p { margin: 0; font-size: 15px; }
    .meta { font-size: 13px; color: #888; margin-top: 8px; }
    .footer { background: #f9f9f9; padding: 20px 40px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}</h1>
    </div>
    <div class="body">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>
        We are writing to inform you that your account has been
        <strong>${statusLabel}</strong> as of <strong>${formattedDate} UTC</strong>.
      </p>

      <div class="reason-box">
        <p><strong>Reason:</strong></p>
        <p>${reason}</p>
        <p class="meta">Effective: ${formattedDate} UTC</p>
      </div>

      <p>
        If you believe this action was taken in error, or if you would like to
        appeal this decision, please contact our support team and reference the
        date and reason above.
      </p>
      <p>We take these actions seriously and only apply them when necessary to
        maintain a safe and trustworthy platform for all users.</p>
      <p>Thank you for your understanding.</p>
    </div>
    <div class="footer">
      This is an automated message. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
  `.trim();

	return { subject, html };
}