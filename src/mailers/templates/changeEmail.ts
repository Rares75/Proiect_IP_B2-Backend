export function changeEmailTemplate(
	otp: string,
	expiresInMinutes: number = 10,
) {
	return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
      <h2 style="color: #333;">Confirmare schimbare email</h2>
      <p>Salut!</p>
      <p>Am primit o cerere de schimbare a adresei de email. Codul tău de confirmare este:</p>
      <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 2px;">${otp}</h1>
      <p>Acest cod expiră în <strong>${expiresInMinutes} minute</strong>.</p>
      <p>Dacă nu ai solicitat această schimbare, ignoră acest email.</p>
      <hr style="margin: 20px 0;">
    </div>
  `;
}
