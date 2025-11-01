import React from 'react';
import { Link } from 'react-router-dom';
import AnimatedSection from './AnimatedSection';

const CookiePolicy: React.FC = () => {
    return (
        <section id="cookie-policy" className="relative z-10 py-20 md:py-32 bg-gradient-to-b from-brand-secondary/20 to-brand-bg">
            <div className="max-w-4xl mx-auto px-6">
                <AnimatedSection>
                    <div className="text-center mb-16">
                        <h1 className="font-display text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-brand-text to-brand-text/60 bg-clip-text text-transparent">
                            Cookie Policy
                        </h1>
                        <p className="text-brand-text/60 text-sm">
                            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </AnimatedSection>

                <div className="space-y-12 text-brand-text/80">
                    <AnimatedSection>
                        <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-2xl p-8">
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                What Are Cookies?
                            </h2>
                            <p className="leading-relaxed mb-4">
                                Cookies are small text files that are placed on your device (computer, smartphone, tablet) when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and provide information to website owners.
                            </p>
                            <p className="leading-relaxed">
                                This Cookie Policy explains how Anóteros Lógos uses cookies and similar tracking technologies on our website <a href="https://anoteroslogos.com" className="text-brand-accent hover:underline">anoteroslogos.com</a>.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                Types of Cookies We Use
                            </h2>
                            <p className="leading-relaxed mb-6">
                                We use the following categories of cookies on our website:
                            </p>

                            <div className="space-y-6">
                                {/* Necessary Cookies */}
                                <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-xl p-6">
                                    <div className="flex items-start gap-4 mb-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-3 h-3 rounded-full bg-brand-accent"></div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg mb-2 text-brand-text">
                                                1. Necessary Cookies (Always Active)
                                            </h3>
                                            <p className="leading-relaxed mb-4 text-brand-text/70">
                                                These cookies are essential for the website to function properly and cannot be disabled. They enable core functionality such as security, network management, and accessibility.
                                            </p>
                                            <div className="bg-brand-bg/50 rounded-lg p-4">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-brand-text/10">
                                                            <th className="text-left py-2 text-brand-text/80">Cookie Name</th>
                                                            <th className="text-left py-2 text-brand-text/80">Purpose</th>
                                                            <th className="text-left py-2 text-brand-text/80">Duration</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-brand-text/70">
                                                        <tr className="border-b border-brand-text/5">
                                                            <td className="py-3 font-mono text-xs">cookieConsent</td>
                                                            <td className="py-3">Stores your cookie preferences</td>
                                                            <td className="py-3">12 months</td>
                                                        </tr>
                                                        <tr className="border-b border-brand-text/5">
                                                            <td className="py-3 font-mono text-xs">sessionID</td>
                                                            <td className="py-3">Maintains your session state</td>
                                                            <td className="py-3">Session</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 font-mono text-xs">security_token</td>
                                                            <td className="py-3">Protects against CSRF attacks</td>
                                                            <td className="py-3">Session</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Analytics Cookies */}
                                <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-xl p-6">
                                    <div className="flex items-start gap-4 mb-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg mb-2 text-brand-text">
                                                2. Analytics Cookies (Optional)
                                            </h3>
                                            <p className="leading-relaxed mb-4 text-brand-text/70">
                                                These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve the website's performance and user experience.
                                            </p>
                                            <div className="bg-brand-bg/50 rounded-lg p-4">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-brand-text/10">
                                                            <th className="text-left py-2 text-brand-text/80">Cookie Name</th>
                                                            <th className="text-left py-2 text-brand-text/80">Purpose</th>
                                                            <th className="text-left py-2 text-brand-text/80">Duration</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-brand-text/70">
                                                        <tr className="border-b border-brand-text/5">
                                                            <td className="py-3 font-mono text-xs">_ga</td>
                                                            <td className="py-3">Google Analytics - distinguishes users</td>
                                                            <td className="py-3">2 years</td>
                                                        </tr>
                                                        <tr className="border-b border-brand-text/5">
                                                            <td className="py-3 font-mono text-xs">_gid</td>
                                                            <td className="py-3">Google Analytics - distinguishes users</td>
                                                            <td className="py-3">24 hours</td>
                                                        </tr>
                                                        <tr className="border-b border-brand-text/5">
                                                            <td className="py-3 font-mono text-xs">_gat</td>
                                                            <td className="py-3">Google Analytics - throttles request rate</td>
                                                            <td className="py-3">1 minute</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 font-mono text-xs">analytics_session</td>
                                                            <td className="py-3">Tracks page views and interactions</td>
                                                            <td className="py-3">30 minutes</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <p className="text-xs text-brand-text/60 mt-3">
                                                Third-party provider: Google LLC (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Privacy Policy</a>)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Marketing Cookies */}
                                <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-xl p-6">
                                    <div className="flex items-start gap-4 mb-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg mb-2 text-brand-text">
                                                3. Marketing Cookies (Optional)
                                            </h3>
                                            <p className="leading-relaxed mb-4 text-brand-text/70">
                                                These cookies are used to track visitors across websites to display relevant advertisements and measure advertising campaign effectiveness.
                                            </p>
                                            <div className="bg-brand-bg/50 rounded-lg p-4">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-brand-text/10">
                                                            <th className="text-left py-2 text-brand-text/80">Cookie Name</th>
                                                            <th className="text-left py-2 text-brand-text/80">Purpose</th>
                                                            <th className="text-left py-2 text-brand-text/80">Duration</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-brand-text/70">
                                                        <tr className="border-b border-brand-text/5">
                                                            <td className="py-3 font-mono text-xs">_fbp</td>
                                                            <td className="py-3">Facebook Pixel - tracks conversions</td>
                                                            <td className="py-3">3 months</td>
                                                        </tr>
                                                        <tr className="border-b border-brand-text/5">
                                                            <td className="py-3 font-mono text-xs">_linkedin_data_partner_id</td>
                                                            <td className="py-3">LinkedIn Insight Tag</td>
                                                            <td className="py-3">90 days</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 font-mono text-xs">marketing_prefs</td>
                                                            <td className="py-3">Stores marketing preferences</td>
                                                            <td className="py-3">12 months</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <p className="text-xs text-brand-text/60 mt-3">
                                                Third-party providers: Meta Platforms, Inc. (<a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Privacy Policy</a>), LinkedIn Corporation (<a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Privacy Policy</a>)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                How to Manage Cookies
                            </h2>
                            <p className="leading-relaxed mb-6">
                                You have several options to control and manage cookies:
                            </p>

                            <div className="space-y-4">
                                <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-xl p-6">
                                    <h3 className="font-semibold text-lg mb-2 text-brand-text">
                                        Cookie Consent Banner
                                    </h3>
                                    <p className="leading-relaxed text-brand-text/70">
                                        When you first visit our website, you will see a cookie consent banner. You can choose to accept all cookies, reject non-essential cookies, or customize your preferences.
                                    </p>
                                </div>

                                <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-xl p-6">
                                    <h3 className="font-semibold text-lg mb-2 text-brand-text">
                                        Browser Settings
                                    </h3>
                                    <p className="leading-relaxed mb-3 text-brand-text/70">
                                        Most web browsers allow you to control cookies through their settings. You can set your browser to refuse cookies or delete certain cookies. Here are links to cookie management guides for popular browsers:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-4 text-brand-text/70 text-sm">
                                        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Google Chrome</a></li>
                                        <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Mozilla Firefox</a></li>
                                        <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Safari</a></li>
                                        <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Microsoft Edge</a></li>
                                    </ul>
                                    <p className="text-xs text-brand-text/60 mt-3">
                                        Note: Disabling cookies may affect the functionality and features of our website.
                                    </p>
                                </div>

                                <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-xl p-6">
                                    <h3 className="font-semibold text-lg mb-2 text-brand-text">
                                        Opt-Out Tools
                                    </h3>
                                    <p className="leading-relaxed mb-3 text-brand-text/70">
                                        You can opt out of targeted advertising from participating companies:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-4 text-brand-text/70 text-sm">
                                        <li><a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Network Advertising Initiative Opt-Out</a></li>
                                        <li><a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Digital Advertising Alliance Opt-Out</a></li>
                                        <li><a href="https://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Your Online Choices (EU)</a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                Third-Party Cookies
                            </h2>
                            <p className="leading-relaxed mb-4">
                                Some cookies on our website are set by third-party services that appear on our pages. We do not control these cookies, and you should check the respective third-party websites for more information about how they use cookies.
                            </p>
                            <p className="leading-relaxed">
                                Third-party services we use include:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-3 text-brand-text/70">
                                <li>Google Analytics - for website traffic analysis</li>
                                <li>Google Fonts - for web typography</li>
                                <li>Social media platforms - for sharing and integration features</li>
                            </ul>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                Updates to This Cookie Policy
                            </h2>
                            <p className="leading-relaxed">
                                We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our business practices. When we make changes, we will update the "Last Updated" date at the top of this policy. We encourage you to review this policy periodically.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                Contact Us
                            </h2>
                            <p className="leading-relaxed mb-4">
                                If you have any questions about our use of cookies or this Cookie Policy, please contact us:
                            </p>
                            <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-xl p-6 space-y-2">
                                <p className="text-brand-text"><strong>Anóteros Lógos</strong></p>
                                <p>Email: <a href="mailto:privacy@anoteroslogos.com" className="text-brand-accent hover:underline">privacy@anoteroslogos.com</a></p>
                                <p>General Inquiries: <a href="mailto:contact@anoteroslogos.com" className="text-brand-accent hover:underline">contact@anoteroslogos.com</a></p>
                            </div>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-2xl p-8 text-center">
                            <p className="text-brand-text/80 leading-relaxed mb-4">
                                For more information about how we handle your personal data, please review our{' '}
                                <Link to="/privacy-policy" className="text-brand-accent hover:underline font-semibold">Privacy Policy</Link>.
                            </p>
                        </div>
                    </AnimatedSection>
                </div>
            </div>
        </section>
    );
};

export default CookiePolicy;
