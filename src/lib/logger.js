export async function logActivity(userId, action, req, details = null) {
  // Safe no-op without database activity_logs table
  return;
}

