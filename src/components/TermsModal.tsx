import { X } from 'lucide-react'

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
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
          <h2 className="text-2xl font-normal text-white">Terms of Service</h2>
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
              <h3 className="text-lg font-medium text-white mb-3">1. Acceptance of Terms</h3>
              <p>
                By accessing and using LyFind, you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to these terms, please do not use this service.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">2. Use of Service</h3>
              <p className="mb-2">
                LyFind is a lost and found platform exclusively for Lyceum of Subic Bay students, faculty, and staff. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide accurate and truthful information</li>
                <li>Use your official LSB email address for registration</li>
                <li>Not post false or misleading information about lost or found items</li>
                <li>Respect the privacy and property of others</li>
                <li>Not use the service for any illegal or unauthorized purpose</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">3. User Accounts</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account. You must immediately notify us of any unauthorized use of your account.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">4. Content Guidelines</h3>
              <p className="mb-2">When posting items, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide accurate descriptions and photos</li>
                <li>Not post inappropriate, offensive, or harmful content</li>
                <li>Respect intellectual property rights</li>
                <li>Remove posts once items are recovered</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">5. Privacy and Data</h3>
              <p>
                Your use of LyFind is also governed by our Privacy Policy. We collect and use your information as described 
                in the Privacy Policy to provide and improve our services.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">6. Prohibited Activities</h3>
              <p className="mb-2">You may not:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Attempt to gain unauthorized access to the service</li>
                <li>Use automated systems to access the service</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Post spam or unsolicited advertisements</li>
                <li>Impersonate others or misrepresent your affiliation</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">7. Limitation of Liability</h3>
              <p>
                LyFind is provided "as is" without warranties of any kind. We are not responsible for the accuracy of 
                user-posted content or for any disputes between users regarding lost or found items.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">8. Termination</h3>
              <p>
                We reserve the right to suspend or terminate your account at any time for violations of these terms or 
                for any other reason at our discretion.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">9. Changes to Terms</h3>
              <p>
                We may modify these terms at any time. Continued use of the service after changes constitutes acceptance 
                of the modified terms.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">10. Contact</h3>
              <p>
                For questions about these terms, please contact us through the official LyFind support channels.
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
