/**
 * @file emailDispatchService.js
 * @description Emergency email dispatch via EmailJS (browser-side, no backend needed).
 *
 * SETUP INSTRUCTIONS:
 * 1. Sign up free at https://www.emailjs.com
 * 2. Add your Gmail under "Email Services" → note your Service ID
 * 3. Create an email template → note your Template ID
 * 4. Go to Account → note your Public Key
 * 5. Replace the three constants below with your real values
 */

import emailjs from '@emailjs/browser';

// ── YOUR EMAILJS CONFIG ─────────────────────────────────────────────────────
// Replace these with your real EmailJS credentials
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'service_lzj0gl7';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_gs6oce7';
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'EleYy0xV_iNVk_mc5';

let _initialized = false;

function ensureInit() {
  if (!_initialized && EMAILJS_PUBLIC_KEY && !EMAILJS_PUBLIC_KEY.startsWith('YOUR_')) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    _initialized = true;
  }
}

/**
 * Send emergency email to a single contact via EmailJS.
 *
 * @param {{ name: string, email: string }} contact
 * @param {{ displayName: string, bloodGroup?: string }} rider
 * @param {{ severity: string, gps: { lat, lon } | null }} incident
 */
async function sendEmergencyEmailToContact(contact, rider, incident) {
  if (!contact.email) return;

  const mapsUrl = incident.gps?.lat
    ? `https://maps.google.com/?q=${incident.gps.lat},${incident.gps.lon}`
    : 'Location unavailable';

  const templateParams = {
    to_email:    contact.email,
    to_name:     contact.name || 'Emergency Contact',
    rider_name:  rider?.displayName || 'Rider',
    blood_group: rider?.bloodGroup  || 'Not specified',
    severity:    incident.severity  || 'SEVERE',
    time:        new Date().toLocaleString(),
    maps_url:    mapsUrl,
  };

  const response = await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams
  );

  console.info(`[EmailJS] Email sent to ${contact.email} — Status: ${response.status}`);
  return response;
}

/**
 * Dispatch emergency emails to ALL emergency contacts.
 *
 * @param {Array<{ name: string, email: string }>} contacts
 * @param {{ displayName: string, bloodGroup?: string }} rider
 * @param {{ severity: string, gps: { lat, lon } | null }} incident
 */
export async function dispatchEmergencyEmails(contacts, rider, incident) {
  // Check if EmailJS is configured
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('[EmailJS] EmailJS credentials missing.');
    return;
  }

  ensureInit();

  const contactsWithEmail = (contacts || []).filter(c => c.email);
  if (contactsWithEmail.length === 0) {
    console.warn('[EmailJS] No emergency contacts have email addresses saved.');
    return;
  }

  console.info(`[EmailJS] Dispatching emergency email to ${contactsWithEmail.length} contact(s)...`);

  // Send to all contacts in parallel
  const results = await Promise.allSettled(
    contactsWithEmail.map(contact =>
      sendEmergencyEmailToContact(contact, rider, incident)
    )
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.info(`[EmailJS] Email dispatch complete: ${sent} sent, ${failed} failed.`);

  if (failed > 0) {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[EmailJS] Failed for contact ${contactsWithEmail[i]?.email}:`, r.reason);
      }
    });
  }
}
