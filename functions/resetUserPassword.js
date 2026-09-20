/**
 * Firebase Cloud Function to Reset User Password
 * 
 * This function allows admins to reset a user's password.
 * It generates a new password, updates Firebase Auth, and sends an email.
 * 
 * Deploy: firebase deploy --only functions:resetUserPassword
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Generate a secure random password
 */
function generateSecurePassword() {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if the caller is an admin
 */
async function isAdmin(uid) {
  try {
    const adminDoc = await admin.firestore().collection('admins').doc(uid).get();
    return adminDoc.exists && adminDoc.data().active === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Send password reset email using Brevo (formerly Sendinblue)
 */
async function sendPasswordEmail(userEmail, userName, newPassword) {
  const SibApiV3Sdk = require('sib-api-v3-sdk');
  
  // Configure Brevo API
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = functions.config().brevo.key;
  
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  
  // Email template
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  
  sendSmtpEmail.subject = 'Your LyFind Password Has Been Reset';
  sendSmtpEmail.sender = { 
    name: 'LyFind Support', 
    email: functions.config().brevo.sender || 'noreply@lyfind.com' 
  };
  sendSmtpEmail.to = [{ email: userEmail, name: userName }];
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: #2f1632; 
          color: white; 
          padding: 30px 20px; 
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content { 
          padding: 30px 20px; 
          background: #f9f9f9;
          border-left: 1px solid #ddd;
          border-right: 1px solid #ddd;
        }
        .password-box { 
          background: white; 
          padding: 20px; 
          font-size: 20px; 
          font-family: 'Courier New', monospace;
          border: 2px solid #ff7400;
          border-radius: 8px;
          text-align: center;
          margin: 25px 0;
          letter-spacing: 2px;
          font-weight: bold;
          color: #2f1632;
        }
        .info-box {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
        }
        .info-box strong {
          color: #856404;
        }
        .instructions {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .instructions ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .instructions li {
          margin: 8px 0;
        }
        .footer { 
          text-align: center; 
          padding: 20px; 
          color: #666;
          background: #f0f0f0;
          border-radius: 0 0 8px 8px;
          font-size: 12px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background: #ff7400;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Your password has been reset by an administrator. You can now log in to your LyFind account using the temporary password below.</p>
          
          <div class="password-box">
            ${newPassword}
          </div>
          
          <div class="info-box">
            <strong>⚠️ Important Security Notice:</strong><br>
            This is a temporary password. Please change it immediately after logging in.
          </div>
          
          <div class="instructions">
            <strong>Next Steps:</strong>
            <ul>
              <li>Copy the password above</li>
              <li>Go to LyFind login page</li>
              <li>Enter your email and the new password</li>
              <li>Navigate to your profile settings</li>
              <li>Change your password to something memorable</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">
            <strong>Need Help?</strong><br>
            If you did not request this password reset or have any concerns, please contact our support team immediately.
          </p>
        </div>
        <div class="footer">
          <p><strong>LyFind</strong> - Lost and Found Platform</p>
          <p>© 2026 LyFind. All rights reserved.</p>
          <p style="margin-top: 10px; color: #999;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Send email
  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Brevo email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    throw error;
  }
}

/**
 * Cloud Function: Reset User Password
 */
exports.resetUserPassword = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to call this function'
    );
  }

  // Check if caller is an admin
  const callerIsAdmin = await isAdmin(context.auth.uid);
  if (!callerIsAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can reset user passwords'
    );
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId is required'
    );
  }

  try {
    // Get user from Firebase Auth
    const userRecord = await admin.auth().getUser(userId);

    // Check if user signed in with Google
    const isGoogleUser = userRecord.providerData.some(
      provider => provider.providerId === 'google.com'
    );

    if (isGoogleUser) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Cannot reset password for Google sign-in users'
      );
    }

    // Generate new password
    const newPassword = generateSecurePassword();

    // Update password in Firebase Auth
    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    // Get user data from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Send email with new password
    await sendPasswordEmail(
      userRecord.email,
      userData?.displayName || 'User',
      newPassword
    );

    // Log the action in adminLogs
    await admin.firestore().collection('adminLogs').add({
      adminUid: context.auth.uid,
      action: 'reset_user_password',
      targetId: userId,
      metadata: {
        userEmail: userRecord.email,
        passwordGenerated: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Password reset successfully',
      email: userRecord.email
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to reset password: ' + error.message
    );
  }
});
