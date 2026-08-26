/**
 * Utility function to sanitize phone numbers across the entire system.
 * Always removes country code '27' or '+27' so phone numbers present cleanly as 10-digit South African numbers (e.g., 8158051119).
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let str = String(phone).trim().replace(/[\s\-\(\)]/g, '');
  
  if (str.startsWith('+27')) {
    str = str.substring(3);
  } else if (str.startsWith('27') && str.length >= 11) {
    str = str.substring(2);
  }
  
  return str;
}
