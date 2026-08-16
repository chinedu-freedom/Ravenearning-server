import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getSiteName() {
  try {
    const settings = await prisma.settings.findFirst();
    return settings?.site_name || "Ravenearning";
  } catch (error) {
    return "Ravenearning";
  }
}

async function getCurrencySymbol() {
  try {
    const settings = await prisma.settings.findFirst();
    return settings?.currency_symbol || "R";
  } catch (error) {
    return "R";
  }
}

export async function sendVerificationEmail() { return { success: true }; }
export async function sendWelcomeEmail() { return { success: true }; }
export async function sendPasswordResetEmail() { return { success: true }; }
export async function sendPasswordChangeConfirmationEmail() { return { success: true }; }
export async function sendPasswordResetConfirmationEmail() { return { success: true }; }
export async function sendDepositNotificationEmail() { return { success: true }; }
export async function sendWithdrawalNotificationEmail() { return { success: true }; }

