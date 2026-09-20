import { X } from 'lucide-react'

interface PrivacyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] backdrop-blur-xl bg-[#2f1632]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-[#2f1632]/95 backdrop-blur-xl">
          <h2 className="text-2xl font-normal text-white">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all"
          >
            <X className="w-6 h-6 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)]">
          <div className="space-y-6 text-white/70 leading-relaxed">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">1. Information We Collect</h3>
              <p className="mb-2">We collect the following information when you use LyFind:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Personal information (name, student ID, LSB email address)</li>
                <li>Account credentials (encrypted password)</li>
                <li>Posted content (item descriptions, photos, locations)</li>
                <li>Messages and communications with other users</li>
                <li>Usage data and analytics</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">2. How We Use Your Information</h3>
              <p className="mb-2">Your information is used to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide and maintain the LyFind service</li>
                <li>Match lost and found items using AI technology</li>
                <li>Send notifications about potential matches</li>
                <li>Facilitate communication between users</li>
                <li>Improve our services and user experience</li>
                <li>Ensure platform security and prevent fraud</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">3. Information Sharing</h3>
              <p className="mb-2">We share your information only in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>With other verified LSB users when you post items or send messages</li>
                <li>With LSB administration when required for security or policy enforcement</li>
                <li>When required by law or legal process</li>
                <li>With your explicit consent</li>
              </ul>
              <p className="mt-2">
                We do not sell your personal information to third parties.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">4. Data Security</h3>
              <p>
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Secure password hashing</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">5. Photo and Image Data</h3>
              <p>
                Photos you upload are processed by our AI matching system to identify lost items. Images are stored 
                securely and are only visible to verified LSB community members. You retain ownership of your photos 
                and can delete them at any time.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">6. Campus Verification</h3>
              <p>
                We verify your LSB affiliation through your official email address. This ensures the platform remains 
                a trusted, campus-only community.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">7. Your Rights</h3>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your data</li>
                <li>Opt-out of non-essential communications</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">8. Data Retention</h3>
              <p>
                We retain your information for as long as your account is active or as needed to provide services. 
                When you delete your account, we remove your personal information within 30 days, except where 
                retention is required by law.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">9. Cookies and Tracking</h3>
              <p>
                We use cookies and similar technologies to maintain your session, remember preferences, and analyze 
                usage patterns. You can control cookie settings through your browser.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">10. Children's Privacy</h3>
              <p>
                LyFind is intended for LSB students, faculty, and staff. We do not knowingly collect information 
                from individuals under 13 years of age.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">11. Changes to Privacy Policy</h3>
              <p>
                We may update this privacy policy periodically. We will notify you of significant changes through 
                the platform or via email.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">12. Contact Us</h3>
              <p>
                For privacy-related questions or to exercise your rights, contact us through the official LyFind 
                support channels or email privacy@lyfind.lsb.edu.ph
              </p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-sm text-white/50">
                Last updated: February 2026
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 border-t border-white/10 bg-[#2f1632]/95 backdrop-blur-xl">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium rounded-xl transition-all"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}
