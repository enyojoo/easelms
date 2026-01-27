"use client"

import { useBrandSettings } from "@/lib/hooks/useBrandSettings"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

export default function TermsPage() {
  const brandSettings = useBrandSettings()
  const platformName = brandSettings.platformName || "EaseLMS"
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">{platformName} Terms of Service</h1>

          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using {platformName}'s learning management system ("Service"),
              you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
            <p className="mb-4">
              Permission is granted to temporarily access the materials (information or software)
              on Enthronement University's website for personal, non-commercial transitory viewing only.
              This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>modify or copy the materials</li>
              <li>use the materials for any commercial purpose or for any public display</li>
              <li>attempt to decompile or reverse engineer any software contained on the Service</li>
              <li>remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="mb-4">
              When you create an account with us, you must provide information that is accurate,
              complete, and current at all times. You are responsible for safeguarding the password
              and for all activities that occur under your account.
            </p>
            <p className="mb-4">
              You agree not to disclose your password to any third party. You must notify us
              immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Course Content</h2>
            <p className="mb-4">
              All course materials provided through {platformName}, including but not limited to videos, quizzes, assignments,
              and downloadable resources, are protected by copyright and intellectual property laws.
            </p>
            <p className="mb-4">
              You may access course content solely for your personal, non-commercial educational use.
              Redistribution, reproduction, or commercial use of course materials is strictly prohibited.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Payment and Refunds</h2>
            <p className="mb-4">
              All fees are non-refundable except as required by law or as expressly stated in {platformName}'s refund policy.
              We offer a 30-day money-back guarantee for most courses, provided that you have not completed
              more than 20% of the course content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Prohibited Uses</h2>
            <p className="mb-4">You may not use our Service:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
              <li>To upload or transmit viruses or any other type of malicious code</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
            <p className="mb-4">
              {platformName} may terminate or suspend your account and bar access to the Service immediately,
              without prior notice or liability, under our sole discretion, for any reason whatsoever
              and without limitation, including but not limited to a breach of the Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="mb-4">
              In no event shall {platformName}, nor its directors, employees, partners,
              agents, suppliers, or affiliates, be liable for any indirect, incidental, special,
              consequential, or punitive damages, including without limitation, loss of profits,
              data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Governing Law</h2>
            <p className="mb-4">
              These Terms shall be interpreted and governed by the laws of the jurisdiction in which
              {platformName} operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
              If a revision is material, we will try to provide at least 30 days notice prior to any
              new terms taking effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="mb-4">
              Email: support@enthronement.edu<br />
              Phone: [Contact Phone Number]<br />
              Address: [Institution Address]
            </p>
          </section>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              By continuing to access or use our Service after any revisions become effective,
              you agree to be bound by the revised terms. If you do not agree to the new terms,
              you are no longer authorized to use the Service.
            </p>
          </div>
        </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}