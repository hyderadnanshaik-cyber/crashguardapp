'use strict';

/**
 * @file emailService.js
 * @description Handles SendGrid transactional emergency emails.
 */

const sgMail = require('@sendgrid/mail');

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey && apiKey.startsWith('SG.')) {
  sgMail.setApiKey(apiKey);
}

/**
 * Send emergency emails to all registered contacts.
 * 
 * @param {Array<Object>} contacts - Emergency contact array [{ name, email, phone }]
 * @param {Object} rider - Rider profile details
 * @param {Object} incident - Incident details
 */
async function sendEmergencyEmail(contacts, rider, incident) {
  if (!contacts || contacts.length === 0) {
    console.log('[Email] No emergency contacts provided for email dispatch.');
    return;
  }

  const validEmails = contacts.map(c => c.email).filter(Boolean);
  if (validEmails.length === 0) {
    console.log('[Email] No valid email addresses found in emergency contacts.');
    return;
  }

  const riderName = rider?.fullName || rider?.displayName || 'Rider';
  const mapsUrl = `https://maps.google.com/?q=${incident.location.latitude},${incident.location.longitude}`;
  const trackingUrl = `${process.env.APP_BASE_URL || 'http://localhost:5174'}/track/${rider.riderId || rider.uid}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #050b14; color: #ffffff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">
        🚨 URGENT: Emergency Impact Detected
      </h2>
      <p style="font-size: 16px;">
        An automated crash detection alert has been triggered for <strong>${riderName}</strong>.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; color: #dddddd;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #333;"><strong>Rider Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #333;">${riderName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #333;"><strong>Blood Group:</strong></td><td style="padding: 8px; border-bottom: 1px solid #333;">${rider?.bloodGroup || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #333;"><strong>Insurance Provider:</strong></td><td style="padding: 8px; border-bottom: 1px solid #333;">${rider?.insuranceProvider || 'N/A'} (Policy: ${rider?.insurancePolicyNo || 'N/A'})</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #333;"><strong>Peak Force:</strong></td><td style="padding: 8px; border-bottom: 1px solid #333;">${incident.peakForce} m/s²</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #333;"><strong>Severity:</strong></td><td style="padding: 8px; border-bottom: 1px solid #333; color: #ef4444; font-weight: bold;">${incident.severity}</td></tr>
      </table>

      <div style="margin-top: 25px; text-align: center;">
        <a href="${mapsUrl}" target="_blank" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; margin-right: 10px; display: inline-block;">
          Open Google Maps
        </a>
        <a href="${trackingUrl}" target="_blank" style="background-color: #1f2937; color: #ffffff; border: 1px solid #4b5563; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
          Live Tracking Portal
        </a>
      </div>
    </div>
  `;

  const msg = {
    to: validEmails,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'alerts@crashguard.ai',
      name: process.env.SENDGRID_FROM_NAME || 'Crash Guard Emergency System',
    },
    subject: `URGENT: Emergency Impact Detected for ${riderName}`,
    html: htmlBody,
  };

  try {
    if (!apiKey || !apiKey.startsWith('SG.')) {
      console.warn('[Email] SendGrid API Key missing or invalid stub. Skipping actual email delivery.');
      console.log('[Email Mock Output]:', msg.subject, 'To:', validEmails);
      return;
    }
    await sgMail.sendMultiple(msg);
    console.log(`[Email] Emergency notification emails sent to: ${validEmails.join(', ')}`);
  } catch (error) {
    console.error('[Email] Error sending SendGrid email:', error?.response?.body || error);
  }
}

module.exports = {
  sendEmergencyEmail,
};
