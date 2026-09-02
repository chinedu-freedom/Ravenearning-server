// Email system is completely disabled for phone-based architecture
export const sendVerificationEmail = async () => ({ success: true });
export const sendWelcomeEmail = async () => ({ success: true });
export const sendPasswordResetEmail = async () => ({ success: true });
export const sendPasswordChangeConfirmationEmail = async () => ({ success: true });
export const sendPasswordResetConfirmationEmail = async () => ({ success: true });
export const sendDepositNotificationEmail = async () => ({ success: true });
export const sendWithdrawalNotificationEmail = async () => ({ success: true });
export default {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmationEmail,
  sendPasswordResetConfirmationEmail,
  sendDepositNotificationEmail,
  sendWithdrawalNotificationEmail
};
