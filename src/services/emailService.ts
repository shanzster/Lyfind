import SibApiV3Sdk from 'sib-api-v3-sdk';

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];

// Get API key from environment variables
const brevoApiKey = import.meta.env?.VITE_BREVO_API_KEY || '';
console.log('[EmailService] Brevo API Key loaded:', brevoApiKey ? `${brevoApiKey.substring(0, 10)}...` : 'NOT FOUND');
apiKey.apiKey = brevoApiKey;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Store OTPs in memory (simple Map)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export const emailService = {
  // Whether the Brevo API key is configured (email sending can be attempted)
  isConfigured(): boolean {
    return Boolean(brevoApiKey);
  },

  // Generate 6-digit OTP
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // Send OTP email
  async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      
      // Validate LSB email
      if (!normalizedEmail.endsWith('@lsb.edu.ph')) {
        return {
          success: false,
          message: 'Only @lsb.edu.ph email addresses are allowed'
        };
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      console.log('[EmailService] Generated OTP:', otp, 'for email:', normalizedEmail);
      
      // Store OTP in memory with 10 minute expiration
      otpStore.set(normalizedEmail, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
      });
      
      console.log('[EmailService] Stored OTP in memory. Store size:', otpStore.size);

      // Send email
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = 'LyFind - Email Verification Code';
      sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - LyFind</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              background: #f5f5f5;
              padding: 40px 20px;
              min-height: 100vh;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
            }
            .glass-card {
              background: #ffffff;
              border: 1px solid #e0e0e0;
              border-radius: 24px;
              padding: 40px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            .logo-container {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo-glow {
              display: inline-block;
              position: relative;
              padding: 20px;
            }
            .logo-glow::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 140px;
              height: 140px;
              background: radial-gradient(circle, rgba(255, 116, 0, 0.15) 0%, transparent 70%);
              border-radius: 50%;
              filter: blur(30px);
              z-index: 0;
            }
            .logo-circle {
              position: relative;
              z-index: 1;
              width: 100px;
              height: 100px;
              display: flex;
              align-items: center;
              justify-content: center;
              animation: float 3s ease-in-out infinite;
            }
            .logo-circle img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              filter: drop-shadow(0 4px 12px rgba(255, 116, 0, 0.3));
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            .brand-name {
              font-size: 36px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 15px 0 5px 0;
              text-shadow: 0 2px 8px rgba(255, 116, 0, 0.2);
            }
            .brand-tagline {
              font-size: 14px;
              color: #666666;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
              margin: 30px 0;
            }
            .content-section {
              text-align: center;
            }
            .greeting {
              font-size: 24px;
              color: #1a1a1a;
              font-weight: 600;
              margin-bottom: 15px;
            }
            .message {
              font-size: 16px;
              color: #4a4a4a;
              line-height: 1.8;
              margin-bottom: 30px;
            }
            .otp-container {
              background: #f9f9f9;
              border: 2px dashed rgba(255, 116, 0, 0.4);
              border-radius: 16px;
              padding: 30px;
              margin: 30px 0;
              position: relative;
              overflow: hidden;
            }
            .otp-container::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 200px;
              height: 200px;
              background: radial-gradient(circle, rgba(255, 116, 0, 0.05) 0%, transparent 70%);
              border-radius: 50%;
              filter: blur(40px);
            }
            .otp-label {
              font-size: 12px;
              color: #666666;
              text-transform: uppercase;
              letter-spacing: 3px;
              margin-bottom: 15px;
              position: relative;
              z-index: 1;
            }
            .otp-code {
              font-size: 56px;
              font-weight: 700;
              color: #ff7400;
              letter-spacing: 12px;
              font-family: 'Courier New', monospace;
              text-shadow: 0 0 20px rgba(255, 116, 0, 0.5);
              margin: 15px 0;
              position: relative;
              z-index: 1;
            }
            .otp-expiry {
              font-size: 14px;
              color: #666666;
              margin-top: 15px;
              position: relative;
              z-index: 1;
            }
            .warning-box {
              background: rgba(255, 116, 0, 0.05);
              border-left: 4px solid #ff7400;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
              text-align: left;
            }
            .warning-title {
              font-size: 14px;
              color: #ff7400;
              font-weight: 600;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .warning-text {
              font-size: 13px;
              color: #4a4a4a;
              line-height: 1.6;
            }
            .footer {
              margin-top: 40px;
              padding-top: 30px;
              border-top: 1px solid #e0e0e0;
              text-align: center;
            }
            .footer-text {
              font-size: 12px;
              color: #999999;
              line-height: 1.8;
            }
            .footer-link {
              color: #ff7400;
              text-decoration: none;
            }
            .footer-link:hover {
              color: #ff8500;
            }
            .badge {
              display: inline-block;
              background: rgba(255, 116, 0, 0.08);
              border: 1px solid rgba(255, 116, 0, 0.3);
              border-radius: 20px;
              padding: 6px 16px;
              font-size: 11px;
              color: #ff7400;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="glass-card">
              <!-- Logo Section -->
              <div class="logo-container">
                <div class="logo-glow">
                  <div class="logo-circle">
                    <img 
                      src="https://res.cloudinary.com/do8pgc1ja/image/upload/v1771776821/lyfind/assets/hfghwr2x4uwtjcdpksss.png" 
                      alt="LyFind Logo"
                    />
                  </div>
                </div>
                <h1 class="brand-name">LyFind</h1>
                <p class="brand-tagline">Lyceum of Subic Bay • Lost & Found</p>
              </div>

              <div class="divider"></div>

              <!-- Content Section -->
              <div class="content-section">
                <h2 class="greeting">🔐 Verify Your Email</h2>
                <p class="message">
                  Welcome to LyFind! To complete your registration and start using our AI-powered lost and found platform, please verify your email address with the code below.
                </p>

                <!-- OTP Box -->
                <div class="otp-container">
                  <div class="otp-label">Your Verification Code</div>
                  <div class="otp-code">${otp}</div>
                  <div class="otp-expiry">⏱️ Expires in 10 minutes</div>
                </div>

                <p class="message">
                  Enter this code in the verification window to activate your account and join the LyFind community.
                </p>

                <!-- Warning Box -->
                <div class="warning-box">
                  <div class="warning-title">
                    <span>⚠️</span>
                    <span>Security Notice</span>
                  </div>
                  <div class="warning-text">
                    Never share this verification code with anyone. LyFind staff will never ask for your code. If you didn't request this verification, please ignore this email or contact support if you have concerns.
                  </div>
                </div>

                <div class="badge">✨ Powered by AI Photo Matching</div>
              </div>

              <!-- Footer -->
              <div class="footer">
                <p class="footer-text">
                  This email was sent to <strong style="color: #1a1a1a;">${email}</strong>
                  <br />
                  LyFind - Campus Lost & Found Platform
                  <br />
                  Lyceum of Subic Bay
                  <br />
                  <br />
                  <a href="http://localhost:3000" class="footer-link">Visit LyFind</a>
                  <br />
                  <br />
                  <span style="font-size: 11px; color: #cccccc;">
                    © 2026 LyFind. All rights reserved.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      sendSmtpEmail.sender = {
        name: 'LyFind',
        email: import.meta.env?.VITE_BREVO_SENDER_EMAIL || 'noreply@lyfind.com'
      };
      sendSmtpEmail.to = [{ email: normalizedEmail, name: normalizedEmail.split('@')[0] }];

      await apiInstance.sendTransacEmail(sendSmtpEmail);

      return {
        success: true,
        message: 'OTP sent successfully to your email'
      };
    } catch (error: any) {
      console.error('[EmailService] Error sending OTP:', error);
      console.error('[EmailService] Error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.text || error.response?.body
      });
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.statusCode === 401 || error.message?.includes('401')) {
        errorMessage = 'Invalid Brevo API key. Please check your configuration.';
        console.error('[EmailService] API Key being used:', brevoApiKey ? `${brevoApiKey.substring(0, 15)}...` : 'NONE');
      } else if (error.statusCode === 400) {
        errorMessage = 'Invalid email configuration. Please contact support.';
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // Verify OTP
  verifyOTP(email: string, otp: string): { success: boolean; message: string } {
    // Normalize email to lowercase and trim OTP
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOTP = otp.trim();
    
    console.log('[EmailService] Verifying OTP:', normalizedOTP, 'for email:', normalizedEmail);
    console.log('[EmailService] Store size:', otpStore.size);
    
    const stored = otpStore.get(normalizedEmail);
    
    if (!stored) {
      console.log('[EmailService] No OTP found for email');
      return {
        success: false,
        message: 'No OTP found. Please request a new one.'
      };
    }

    // Check if expired
    if (Date.now() > stored.expiresAt) {
      console.log('[EmailService] OTP expired');
      otpStore.delete(normalizedEmail);
      return {
        success: false,
        message: 'OTP has expired. Please request a new one.'
      };
    }

    // Verify OTP
    if (stored.otp !== normalizedOTP) {
      console.log('[EmailService] OTP mismatch. Expected:', stored.otp, 'Got:', normalizedOTP);
      return {
        success: false,
        message: 'Invalid OTP. Please check and try again.'
      };
    }

    console.log('[EmailService] OTP verified successfully');
    // OTP is valid, remove it
    otpStore.delete(normalizedEmail);
    return {
      success: true,
      message: 'Email verified successfully!'
    };
  },

  // Resend OTP
  async resendOTP(email: string): Promise<{ success: boolean; message: string }> {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Delete old OTP if exists
    otpStore.delete(normalizedEmail);
    console.log('[EmailService] Deleted old OTP for:', normalizedEmail);
    
    // Send new OTP
    return this.sendOTP(normalizedEmail);
  },

  // Send account creation email with credentials
  async sendAccountCredentials(
    email: string,
    displayName: string,
    password: string,
    role: 'user' | 'admin' = 'user'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const isAdmin = role === 'admin';

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = `LyFind - Your ${isAdmin ? 'Admin' : ''} Account Has Been Created`;
      sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to LyFind</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              background: #f5f5f5;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
            }
            .glass-card {
              background: #ffffff;
              border: 1px solid #e0e0e0;
              border-radius: 24px;
              padding: 40px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            .logo-container {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo-circle {
              width: 100px;
              height: 100px;
              margin: 0 auto 15px;
            }
            .logo-circle img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .brand-name {
              font-size: 36px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 15px 0 5px 0;
            }
            .brand-tagline {
              font-size: 14px;
              color: #666666;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .admin-badge {
              display: inline-block;
              background: linear-gradient(135deg, #ff7400, #ff8500);
              color: white;
              padding: 8px 20px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 10px;
            }
            .divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
              margin: 30px 0;
            }
            .greeting {
              font-size: 24px;
              color: #1a1a1a;
              font-weight: 600;
              margin-bottom: 15px;
              text-align: center;
            }
            .message {
              font-size: 16px;
              color: #4a4a4a;
              line-height: 1.8;
              margin-bottom: 25px;
              text-align: center;
            }
            .credentials-box {
              background: #f9f9f9;
              border: 2px solid rgba(255, 116, 0, 0.3);
              border-radius: 16px;
              padding: 30px;
              margin: 30px 0;
            }
            .credential-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .credential-row:last-child {
              border-bottom: none;
            }
            .credential-label {
              font-size: 14px;
              color: #666666;
              font-weight: 600;
            }
            .credential-value {
              font-size: 18px;
              color: #1a1a1a;
              font-weight: 700;
              font-family: 'Courier New', monospace;
            }
            .password-value {
              color: #ff7400;
              font-size: 24px;
              letter-spacing: 2px;
            }
            .warning-box {
              background: rgba(255, 116, 0, 0.05);
              border-left: 4px solid #ff7400;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
            }
            .warning-title {
              font-size: 14px;
              color: #ff7400;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .warning-text {
              font-size: 13px;
              color: #4a4a4a;
              line-height: 1.6;
            }
            .steps-box {
              background: #f9f9f9;
              border-radius: 12px;
              padding: 25px;
              margin: 25px 0;
            }
            .step {
              display: flex;
              gap: 15px;
              margin-bottom: 15px;
            }
            .step:last-child {
              margin-bottom: 0;
            }
            .step-number {
              flex-shrink: 0;
              width: 32px;
              height: 32px;
              background: #ff7400;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 600;
              font-size: 14px;
            }
            .step-text {
              flex: 1;
              padding-top: 5px;
              font-size: 14px;
              color: #4a4a4a;
            }
            .cta-button {
              display: inline-block;
              background: #ff7400;
              color: white;
              padding: 15px 40px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              margin-top: 40px;
              padding-top: 30px;
              border-top: 1px solid #e0e0e0;
              text-align: center;
            }
            .footer-text {
              font-size: 12px;
              color: #999999;
              line-height: 1.8;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="glass-card">
              <div class="logo-container">
                <div class="logo-circle">
                  <img 
                    src="https://res.cloudinary.com/do8pgc1ja/image/upload/v1771776821/lyfind/assets/hfghwr2x4uwtjcdpksss.png" 
                    alt="LyFind Logo"
                  />
                </div>
                <h1 class="brand-name">LyFind</h1>
                <p class="brand-tagline">Lyceum of Subic Bay • Lost & Found</p>
                ${isAdmin ? '<div class="admin-badge">👑 Administrator Account</div>' : ''}
              </div>

              <div class="divider"></div>

              <h2 class="greeting">🎉 Welcome to LyFind, ${displayName}!</h2>
              <p class="message">
                Your LyFind ${isAdmin ? 'administrator' : ''} account has been created. Below are your login credentials to access the platform.
              </p>

              <div class="credentials-box">
                <div class="credential-row">
                  <span class="credential-label">📧 Email</span>
                  <span class="credential-value">${email}</span>
                </div>
                <div class="credential-row">
                  <span class="credential-label">🔑 Temporary Password</span>
                  <span class="credential-value password-value">${password}</span>
                </div>
                ${isAdmin ? `
                <div class="credential-row">
                  <span class="credential-label">👑 Account Type</span>
                  <span class="credential-value" style="color: #ff7400;">Administrator</span>
                </div>
                ` : ''}
              </div>

              <div class="warning-box">
                <div class="warning-title">🔒 Important Security Notice</div>
                <div class="warning-text">
                  This is a temporary password. For your security, please change it immediately after your first login. Never share your password with anyone.
                  ${isAdmin ? ' As an administrator, you have elevated privileges - please use them responsibly.' : ''}
                </div>
              </div>

              <div class="steps-box">
                <div class="step">
                  <div class="step-number">1</div>
                  <div class="step-text">Visit the LyFind platform and click "${isAdmin ? 'Admin Login' : 'Login'}"</div>
                </div>
                <div class="step">
                  <div class="step-number">2</div>
                  <div class="step-text">Enter your email and temporary password</div>
                </div>
                <div class="step">
                  <div class="step-number">3</div>
                  <div class="step-text">Complete your profile and change your password</div>
                </div>
                <div class="step">
                  <div class="step-number">4</div>
                  <div class="step-text">${isAdmin ? 'Access the admin dashboard and start managing the platform!' : 'Start using LyFind to find or report lost items!'}</div>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="http://localhost:3000/${isAdmin ? 'admin/login' : 'auth'}" class="cta-button">Login to LyFind</a>
              </div>

              <p class="message" style="margin-top: 30px;">
                If you have any questions or need assistance, please contact the LyFind support team.
              </p>

              <div class="footer">
                <p class="footer-text">
                  LyFind - Campus Lost & Found Platform<br />
                  Lyceum of Subic Bay<br />
                  <br />
                  © 2026 LyFind. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      sendSmtpEmail.sender = {
        name: 'LyFind',
        email: import.meta.env?.VITE_BREVO_SENDER_EMAIL || 'noreply@lyfind.com'
      };
      sendSmtpEmail.to = [{ email: normalizedEmail, name: displayName }];

      await apiInstance.sendTransacEmail(sendSmtpEmail);

      return {
        success: true,
        message: 'Account credentials sent successfully'
      };
    } catch (error: any) {
      console.error('Error sending account credentials:', error);
      return {
        success: false,
        message: 'Failed to send credentials email'
      };
    }
  },

  // ── Announcement blast ──────────────────────────────────────────────────
  // Sends one personalised email per recipient using Brevo's messageVersions
  // batching (many versions per API call). Failures in one chunk do not stop
  // the rest; the caller gets sent/failed totals.
  async sendAnnouncementBlast(
    announcement: { title: string; message: string; priority?: string },
    recipients: { email: string; name: string }[],
    onProgress?: (sent: number, total: number) => void
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    if (!brevoApiKey) {
      throw new Error('Brevo API key is not configured (VITE_BREVO_API_KEY)');
    }

    const CHUNK = 50; // versions per API request (Brevo allows up to 2000 recipients per call)
    const appUrl = import.meta.env?.VITE_APP_URL || 'https://lyfind-72845.web.app';
    const sender = {
      name: 'LyFind',
      email: import.meta.env?.VITE_BREVO_SENDER_EMAIL || 'noreply@lyfind.com',
    };
    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const priorityLabel =
      announcement.priority === 'urgent' ? '🚨 Urgent' :
      announcement.priority === 'warning' ? '⚠️ Notice' : '📢 Announcement';
    const accent =
      announcement.priority === 'urgent' ? '#dc2626' :
      announcement.priority === 'warning' ? '#d97706' : '#ff7400';
    const bodyHtml = escapeHtml(announcement.message).replace(/\n/g, '<br />');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
            <div style="background:#2f1632;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">LyFind</p>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">Campus Lost &amp; Found</p>
            </div>
            <div style="padding:32px;">
              <p style="margin:0 0 8px;display:inline-block;padding:4px 10px;border-radius:999px;background:${accent}1a;color:${accent};font-size:12px;font-weight:600;">${priorityLabel}</p>
              <h1 style="margin:12px 0 8px;color:#111827;font-size:22px;">${escapeHtml(announcement.title)}</h1>
              <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Hi {{params.name}},</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">${bodyHtml}</p>
              <a href="${appUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">Open LyFind</a>
            </div>
            <div style="padding:16px 32px;background:#f9fafb;color:#9ca3af;font-size:12px;">
              You received this because you are on the LyFind campus mailing list.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `${priorityLabel}\n\n${announcement.title}\n\nHi {{params.name}},\n\n${announcement.message}\n\nOpen LyFind: ${appUrl}`;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < recipients.length; i += CHUNK) {
      const chunk = recipients.slice(i, i + CHUNK);
      // Local SDK typings omit textContent/messageVersions; both are supported by the API
      const email: any = new SibApiV3Sdk.SendSmtpEmail();
      email.sender = sender;
      email.subject = `${announcement.title} — LyFind`;
      email.htmlContent = html;
      email.textContent = text;
      email.messageVersions = chunk.map((r) => ({
        to: [{ email: r.email, name: r.name }],
        params: { name: r.name || r.email.split('@')[0] },
      }));

      try {
        await apiInstance.sendTransacEmail(email);
        sent += chunk.length;
      } catch (error: any) {
        failed += chunk.length;
        const detail = error?.response?.text || error?.response?.body?.message || error?.message || 'Unknown error';
        console.error('[EmailService] Announcement chunk failed:', detail);
        errors.push(String(detail));
        if (error?.statusCode === 401) break; // bad key: no point continuing
      }
      onProgress?.(sent + failed, recipients.length);
    }

    return { sent, failed, errors };
  }
};
