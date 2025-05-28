import React from 'react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg">
          <p className="text-gray-600 mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing and using Effortless Agent, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use License</h2>
            <p className="text-gray-600 mb-4">
              Permission is granted to temporarily use Effortless Agent for personal, non-commercial purposes. This license does not include:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for commercial purposes</li>
              <li>Attempting to reverse engineer any software contained in the application</li>
              <li>Removing any copyright or proprietary notations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Responsibilities</h2>
            <p className="text-gray-600 mb-4">
              As a user of Effortless Agent, you agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Use the application in compliance with all applicable laws</li>
              <li>Not misuse or abuse the application</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Disclaimer</h2>
            <p className="text-gray-600">
              Effortless Agent is provided &quot;as is&quot;. We make no warranties, expressed or implied, and hereby disclaim all warranties of merchantability and fitness for a particular purpose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Limitations</h2>
            <p className="text-gray-600">
              In no event shall Effortless Agent or its suppliers be liable for any damages arising out of the use or inability to use the application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Contact Information</h2>
            <p className="text-gray-600">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:hello.mdanassaif@gmail.com" className="text-black hover:underline">
                hello.mdanassaif@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 