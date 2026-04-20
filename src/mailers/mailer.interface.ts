export interface Mailer {
  sendVerificationEmail(to: string, otp: string): Promise<void>;
  sendSignInEmail(to: string, otp: string): Promise<void>;
  sendResetPasswordEmail(to: string, otp: string): Promise<void>;
}