export function signInTemplate(otp: string, expiresInMinutes: number = 10) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
      <h2 style="color: #333;">Autentificare</h2>
      <p>Codul tău de autentificare este:</p>
      <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 2px;">${otp}</h1>
      <p>Valabil <strong>${expiresInMinutes} minute</strong>.</p>
      <p>Dacă nu ai solicitat autentificarea, ignoră acest email.</p>
      <hr style="margin: 20px 0;">
    </div>
  `;
}