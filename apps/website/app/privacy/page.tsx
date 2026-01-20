"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useBrandSettings } from "@/lib/hooks/useBrandSettings"

export default function PrivacyPage() {
  const brandSettings = useBrandSettings()
  const platformName = brandSettings.platformName || "EaseLMS"
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">{platformName} Privacy Policy</h1>

          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="mb-4">
              We collect information you provide directly to us, such as when you create an account,
              enroll in courses, make payments, or contact us for support.
            </p>
            <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Name and contact information (email, phone number)</li>
              <li>Account credentials (username, password)</li>
              <li>Payment information (processed securely by third-party providers)</li>
              <li>Educational background and professional information</li>
              <li>Profile information and preferences</li>
            </ul>
            <h3 className="text-lg font-semibold mb-2">Usage Information</h3>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Course progress and completion data</li>
              <li>Learning analytics and performance metrics</li>
              <li>Device and browser information</li>
              <li>IP address and location data</li>
              <li>Interaction with course materials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Provide, maintain, and improve our learning platform</li>
              <li>Process enrollments and payments</li>
              <li>Personalize your learning experience</li>
              <li>Track progress and issue certificates</li>
              <li>Send important updates about your courses</li>
              <li>Provide customer support</li>
              <li>Analyze usage patterns to improve our services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
            <p className="mb-4">
              We do not sell, trade, or rent your personal information to third parties.
              We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist our operations (under strict confidentiality agreements)</li>
              <li>In connection with a business transfer or acquisition</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational measures to protect your personal
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>SSL/TLS encryption for data transmission</li>
              <li>Secure data storage with access controls</li>
              <li>Regular security audits and updates</li>
              <li>Employee training on data protection</li>
              <li>Incident response procedures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar technologies to enhance your experience on our platform.
            </p>
            <h3 className="text-lg font-semibold mb-2">Types of Cookies We Use</h3>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li><strong>Essential Cookies:</strong> Required for basic platform functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use our platform</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
            </ul>
            <p className="mb-4">
              You can control cookie settings through your browser preferences.
              However, disabling certain cookies may affect platform functionality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="mb-4">You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Request transfer of your data</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="mb-4">
              We retain your personal information for as long as necessary to provide our services
              and fulfill the purposes outlined in this policy, unless a longer retention period
              is required by law.
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Account data is retained while your account is active</li>
              <li>Course progress data is retained for educational and certification purposes</li>
              <li>Payment data is retained according to financial regulations</li>
              <li>Deleted accounts may have some data retained for legal and audit purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. International Data Transfers</h2>
            <p className="mb-4">
              Your information may be transferred to and processed in countries other than your own.
              We ensure appropriate safeguards are in place to protect your data during such transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="mb-4">
              Our platform is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you are a parent or guardian
              and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Third-Party Services</h2>
            <p className="mb-4">
              Our platform may contain links to third-party websites or integrate with third-party services.
              We are not responsible for the privacy practices of these third parties.
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Payment processors (Stripe, Flutterwave)</li>
              <li>Video hosting services</li>
              <li>Analytics providers</li>
              <li>Social media platforms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="mb-2">
                <strong>Data Protection Officer</strong><br />
                {platformName}<br />
                Email: privacy@{platformName.toLowerCase().replace(/\s+/g, '')}.com<br />
                Phone: [Contact Phone Number]
              </p>
            </div>
          </section>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              This privacy policy is effective as of the date indicated above and will remain in effect
              except with respect to any changes in its provisions in the future, which will be in effect
              immediately after being posted on this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}