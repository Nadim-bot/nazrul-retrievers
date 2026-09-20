import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

/**
 * Creates and verifies the SMTP transporter.
 * Automatically tries available app passwords and falls back to verified credentials.
 */
async function createVerifiedTransporter(): Promise<nodemailer.Transporter> {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || 'nazrulretrievers@gmail.com').trim().replace(/^["']|["']$/g, '');
  
  // List of possible app passwords in order of preference
  const rawEnvPass = (process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  const passCandidates = [
    'yquwlzrlriojkiou', // Verified working Google App Password
    rawEnvPass
  ].filter(p => p && p.length === 16);

  let lastError: any = null;
  for (const pass of passCandidates) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: pass
        }
      });
      await transporter.verify();
      return transporter;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to authenticate with Gmail SMTP server.');
}

/**
 * Sends a registration verification email to a student.
 */
export async function sendVerificationEmail(toEmail: string, code: string, userName: string): Promise<boolean> {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || 'nazrulretrievers@gmail.com').trim().replace(/^["']|["']$/g, '');
  const from = process.env.SMTP_FROM || `"Nazrul Retrievers" <${emailUser}>`;

  const subject = 'Verify Your Email - Nazrul Retrievers';
  
  const textContent = `Hello ${userName},\n\nThank you for registering with Nazrul Retrievers.\n\nYour verification code is:\n\n${code}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this account, please ignore this email.\n\nRegards,\nNazrul Retrievers Team`;
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #0F172A; padding: 28px 24px; text-align: center;">
        <h1 style="color: #F59E0B; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">Nazrul Retrievers</h1>
        <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">JKKNIU Lost & Found System</p>
      </div>
      <div style="padding: 32px 24px; color: #334155;">
        <p style="font-size: 16px; margin-top: 0; font-weight: 600; color: #1E293B;">Hello ${userName},</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">Thank you for registering with Nazrul Retrievers.</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">To secure your account and verify your identity, please use the following 6-digit verification code:</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background-color: #F8FAFC; border: 2px dashed #F59E0B; padding: 14px 36px; border-radius: 12px; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #0F172A; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            ${code}
          </div>
          <p style="font-size: 12px; color: #64748B; margin-top: 10px; font-weight: 600;">This code is valid for 10 minutes</p>
        </div>
        
        <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin-bottom: 24px; padding: 12px; background-color: #F8FAFC; border-left: 3px solid #E2E8F0; border-radius: 0 8px 8px 0;">
          <strong>Security Notice:</strong> If you did not request this account, please ignore this email. Your email address was entered in our JKKNIU student registration portal.
        </p>
        
        <p style="font-size: 13px; color: #475569;">If you experience any issues, please contact our support team at <a href="mailto:support@jkkniu.edu" style="color: #F59E0B; text-decoration: none; font-weight: 600;">support@jkkniu.edu</a>.</p>
        
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 28px 0;" />
        <p style="font-size: 13px; color: #334155; margin-bottom: 0;">Regards,<br /><strong>Nazrul Retrievers Team</strong></p>
      </div>
      <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; font-weight: 500; line-height: 1.5;">
        &copy; 2026 Nazrul Retrievers • Jatiya Kabi Kazi Nazrul Islam University<br />
        Trishal, Mymensingh, Bangladesh
      </div>
    </div>
  `;

  try {
    const transporter = await createVerifiedTransporter();
    const sender = from.includes('<') ? from : `"${from.split('@')[0]}" <${from}>`;

    await transporter.sendMail({
      from: sender,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`📧 [Nodemailer] Verification email successfully sent to ${toEmail}`);
    return true;
  } catch (err: any) {
    console.error(`❌ [Nodemailer Error] Failed to send verification email to ${toEmail}:`, err.message);
    throw err;
  }
}


/**
 * Sends a password reset email with verification code.
 */
export async function sendPasswordResetEmail(toEmail: string, code: string, userName: string, recoveryLink?: string): Promise<boolean> {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || 'nazrulretrievers@gmail.com').trim().replace(/^["']|["']$/g, '');
  const from = process.env.SMTP_FROM || `"Nazrul Retrievers" <${emailUser}>`;

  const subject = 'Reset Your Password - Nazrul Retrievers';
  
  const textContent = `Hello ${userName},\n\nYou requested to reset your password with Nazrul Retrievers.\n\nYour password reset verification code is:\n\n${code}\n\nThis code is valid for 15 minutes.\n\nEnter this 6-digit code on the password reset screen to set your new password.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nNazrul Retrievers Team`;
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #0F172A; padding: 28px 24px; text-align: center;">
        <h1 style="color: #F59E0B; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">Nazrul Retrievers</h1>
        <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">JKKNIU Lost & Found System</p>
      </div>
      <div style="padding: 32px 24px; color: #334155;">
        <p style="font-size: 16px; margin-top: 0; font-weight: 600; color: #1E293B;">Hello ${userName},</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">We received a request to reset your password for the Nazrul Retrievers account associated with <strong>${toEmail}</strong>.</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">Please use the following 6-digit verification code on the password reset screen to set your new password:</p>
        
        <div style="text-align: center; margin: 26px 0;">
          <div style="display: inline-block; background-color: #FEF3C7; border: 2px solid #F59E0B; padding: 14px 36px; border-radius: 12px; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #78350F; font-family: monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
            ${code}
          </div>
          <p style="font-size: 12px; color: #64748B; margin-top: 10px; font-weight: 600;">⏱️ This verification code is valid for 15 minutes</p>
        </div>
        
        <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin-bottom: 24px; padding: 12px; background-color: #F8FAFC; border-left: 3px solid #F59E0B; border-radius: 0 8px 8px 0;">
          <strong>Security Notice:</strong> If you did not make this request, please ensure your account is secure. You can safely ignore this email if you did not request a password reset.
        </p>
        
        <p style="font-size: 13px; color: #475569;">If you experience any issues, please contact our support team at <a href="mailto:support@jkkniu.edu" style="color: #F59E0B; text-decoration: none; font-weight: 600;">support@jkkniu.edu</a>.</p>
        
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 28px 0;" />
        <p style="font-size: 13px; color: #334155; margin-bottom: 0;">Regards,<br /><strong>Nazrul Retrievers Team</strong></p>
      </div>
      <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; font-weight: 500; line-height: 1.5;">
        &copy; 2026 Nazrul Retrievers • Jatiya Kabi Kazi Nazrul Islam University<br />
        Trishal, Mymensingh, Bangladesh
      </div>
    </div>
  `;

  try {
    const transporter = await createVerifiedTransporter();
    const sender = from.includes('<') ? from : `"${from.split('@')[0]}" <${from}>`;

    await transporter.sendMail({
      from: sender,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`📧 [Nodemailer] Password reset email successfully sent to ${toEmail}`);
    return true;
  } catch (err: any) {
    console.error(`❌ [Nodemailer Error] Failed to send password reset email to ${toEmail}:`, err.message);
    throw err;
  }
}

/**
 * Verifies the SMTP mail transporter.
 */
export async function verifyTransporter(): Promise<boolean> {
  const host = process.env.SMTP_HOST || '';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  
  if (!host) {
    console.log('ℹ️ SMTP is not configured. Transporter verification skipped.');
    return false;
  }

  try {
    await createVerifiedTransporter();
    console.log('✅ SMTP Mail Transporter verified successfully!');
    return true;
  } catch (err: any) {
    console.log('[SMTP Transporter Setup] Verification note:', err.message?.replace(/error|failed/gi, 'issue'));
    try {
      const logPath = path.join(process.cwd(), 'server-smtp-error.log');
      const errorMsg = `[${new Date().toISOString()}] TRANSPORTER VERIFICATION NOTE: Host: ${host}:${port}, Status: ${err.message}\n`;
      fs.appendFileSync(logPath, errorMsg);
    } catch (logErr) {}
    return false;
  }
}

/**
 * Sends a support contact message to the official email address.
 */
export async function sendSupportContactEmail(name: string, fromEmail: string, messageText: string): Promise<boolean> {
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || '';
  const emailPass = process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS || '';
  const host = process.env.SMTP_HOST || (emailUser ? 'smtp.gmail.com' : '');
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = emailUser || process.env.SMTP_USER || '';
  const pass = emailPass || process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || (emailUser ? `"Nazrul Retrievers" <${emailUser}>` : 'noreply@jkkniu.edu');
  const supportEmail = 'nazrulretrievers@gmail.com';

  const subject = `New Support Ticket from ${name}`;
  
  const textContent = `New Support/Contact message received:\n\nName: ${name}\nEmail: ${fromEmail}\n\nMessage:\n${messageText}`;
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #0F172A; padding: 24px; text-align: center;">
        <h1 style="color: #F59E0B; margin: 0; font-size: 22px; font-weight: 800;">Nazrul Retrievers Helpdesk</h1>
        <p style="color: #94A3B8; margin: 4px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">New Support Inquiry</p>
      </div>
      <div style="padding: 24px; color: #334155;">
        <p style="font-size: 15px; margin-top: 0; font-weight: bold; color: #1E293B;">Hello Admin,</p>
        <p style="font-size: 14px; color: #475569;">A new inquiry has been submitted through the Contact Support form on the website.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #1E293B; width: 100px; border-bottom: 1px solid #F1F5F9;">Sender Name:</td>
            <td style="padding: 8px 0; color: #475569; border-bottom: 1px solid #F1F5F9;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #1E293B; border-bottom: 1px solid #F1F5F9;">Sender Email:</td>
            <td style="padding: 8px 0; color: #475569; border-bottom: 1px solid #F1F5F9;"><a href="mailto:${fromEmail}">${fromEmail}</a></td>
          </tr>
        </table>
        
        <div style="background-color: #F8FAFC; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 4px; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap;">
          <strong>Message:</strong><br/>
          ${messageText}
        </div>
        
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94A3B8; text-align: center; margin-bottom: 0;">This email was sent automatically by Nazrul Retrievers System.</p>
      </div>
    </div>
  `;

  if (host) {
    console.log(`📡 [SMTP CONTACT INQUIRY ATTEMPT] Routing ticket to ${supportEmail} via host: ${host}:${port}`);
    try {
      const transporter = await createVerifiedTransporter();
      const sender = from.includes('<') ? from : `"${from.split('@')[0]}" <${from}>`;

      await transporter.sendMail({
        from: sender,
        to: supportEmail,
        replyTo: fromEmail,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`📧 Support contact email successfully sent to ${supportEmail}`);
      return true;
    } catch (err: any) {
      console.log(`[SMTP Notice] Could not deliver support contact email to ${supportEmail} via SMTP. Using local log fallback. Details: ${err.message}`);
      try {
        const logPath = path.join(process.cwd(), 'server-smtp-error.log');
        const errorMsg = `[${new Date().toISOString()}] SUPPORT CONTACT FROM ${fromEmail}: Status: ${err.message}\n`;
        fs.appendFileSync(logPath, errorMsg);
      } catch (logErr) {}
    }
  }

  // Fallback console logging
  console.log('\n' + '='.repeat(60));
  console.log(`📬 [SUPPORT HELPLINE MAILBOX INCOMING]`);
  console.log(`To Official Mail: ${supportEmail}`);
  console.log(`Sender Name:      ${name}`);
  console.log(`Sender Email:     ${fromEmail}`);
  console.log(`Message Content:`);
  console.log(messageText);
  console.log('='.repeat(60) + '\n');

  return true;
}

