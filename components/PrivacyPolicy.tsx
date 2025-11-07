import React from 'react';
import { Link } from 'react-router-dom';
import AnimatedSection from './AnimatedSection';

const PrivacyPolicy: React.FC = () => {
    return (
        <section id="privacy-policy" className="relative z-10 py-20 md:py-32 bg-gradient-to-b from-brand-bg to-brand-secondary/20">
            <div className="max-w-4xl mx-auto px-6">
                <AnimatedSection>
                    <div className="text-center mb-16">
                        <h1 className="font-display text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-brand-text to-brand-text/60 bg-clip-text text-transparent">
                            Privacy Policy
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
                                Introduction
                            </h2>
                            <p className="leading-relaxed mb-4">
                                Anóteros Lógos ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <a href="https://anoteroslogos.com" className="text-brand-accent hover:underline">anoteroslogos.com</a> and use our services.
                            </p>
                            <p className="leading-relaxed">
                                By accessing or using our website and services, you agree to the terms of this Privacy Policy. If you do not agree with the terms, please do not access the website or use our services.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                1. Information We Collect
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="font-semibold text-lg mb-3 text-brand-text">
                                        1.1 Personal Information
                                    </h3>
                                    <p className="leading-relaxed mb-3">
                                        We collect personal information that you voluntarily provide to us when you:
                                    </p>
                                    <ul className="list-disc list-inside space-y-2 ml-4 text-brand-text/70">
                                        <li>Submit a contact form or inquiry</li>
                                        <li>Subscribe to our newsletter</li>
                                        <li>Request a consultation or demo</li>
                                        <li>Engage with our services</li>
                                    </ul>
                                    <p className="leading-relaxed mt-3">
                                        This information may include: full name, email address, company name, job title, phone number, and any other information you choose to provide.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg mb-3 text-brand-text">
                                        1.2 Automatically Collected Information
                                    </h3>
                                    <p className="leading-relaxed mb-3">
                                        When you visit our website, we automatically collect certain information about your device and browsing activity, including:
                                    </p>
                                    <ul className="list-disc list-inside space-y-2 ml-4 text-brand-text/70">
                                        <li>IP address and approximate geographic location</li>
                                        <li>Browser type and version</li>
                                        <li>Operating system</li>
                                        <li>Referring website and pages visited</li>
                                        <li>Date and time of visit</li>
                                        <li>Device identifiers and cookies</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg mb-3 text-brand-text">
                                        1.3 Cookies and Tracking Technologies
                                    </h3>
                                    <p className="leading-relaxed">
                                        We use cookies and similar tracking technologies to enhance your experience and analyze website traffic. For detailed information, please review our <Link to="/cookie-policy" className="text-brand-accent hover:underline">Cookie Policy</Link>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                2. How We Use Your Information
                            </h2>
                            <p className="leading-relaxed mb-4">
                                We use the collected information for the following purposes:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 text-brand-text/70">
                                <li>To provide, operate, and maintain our services</li>
                                <li>To respond to your inquiries and provide customer support</li>
                                <li>To send you newsletters, marketing communications, and updates (with your consent)</li>
                                <li>To analyze website usage and improve our content and services</li>
                                <li>To detect, prevent, and address technical issues and security threats</li>
                                <li>To comply with legal obligations and enforce our terms</li>
                                <li>To personalize your experience and deliver relevant content</li>
                            </ul>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                3. Legal Basis for Processing (GDPR)
                            </h2>
                            <p className="leading-relaxed mb-4">
                                If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, we process your personal data based on the following legal grounds:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 text-brand-text/70">
                                <li><strong className="text-brand-text">Consent:</strong> When you provide explicit consent for specific processing activities</li>
                                <li><strong className="text-brand-text">Contractual Necessity:</strong> To fulfill our contractual obligations when you engage our services</li>
                                <li><strong className="text-brand-text">Legitimate Interests:</strong> To operate our business, improve our services, and ensure security</li>
                                <li><strong className="text-brand-text">Legal Obligation:</strong> To comply with applicable laws and regulations</li>
                            </ul>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                4. How We Share Your Information
                            </h2>
                            <p className="leading-relaxed mb-4">
                                We do not sell, rent, or trade your personal information. We may share your information in the following circumstances:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 text-brand-text/70">
                                <li><strong className="text-brand-text">Service Providers:</strong> With trusted third-party service providers who assist us in operating our website and services (e.g., hosting, email delivery, analytics)</li>
                                <li><strong className="text-brand-text">Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
                                <li><strong className="text-brand-text">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                                <li><strong className="text-brand-text">Protection of Rights:</strong> To protect our rights, property, safety, and that of our users and the public</li>
                            </ul>
                            <p className="leading-relaxed mt-4">
                                All third-party service providers are contractually obligated to maintain the confidentiality and security of your information.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                5. International Data Transfers
                            </h2>
                            <p className="leading-relaxed mb-4">
                                Your information may be transferred to and processed in countries other than your country of residence. We ensure that appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable data protection laws, including:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 text-brand-text/70">
                                <li>Standard Contractual Clauses approved by the European Commission</li>
                                <li>Privacy Shield frameworks (where applicable)</li>
                                <li>Other legally recognized transfer mechanisms</li>
                            </ul>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                6. Data Retention
                            </h2>
                            <p className="leading-relaxed">
                                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When your information is no longer needed, we will securely delete or anonymize it.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                7. Your Rights and Choices
                            </h2>
                            <p className="leading-relaxed mb-4">
                                Depending on your location, you may have the following rights regarding your personal information:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 text-brand-text/70">
                                <li><strong className="text-brand-text">Access:</strong> Request a copy of the personal information we hold about you</li>
                                <li><strong className="text-brand-text">Rectification:</strong> Request correction of inaccurate or incomplete information</li>
                                <li><strong className="text-brand-text">Erasure:</strong> Request deletion of your personal information ("right to be forgotten")</li>
                                <li><strong className="text-brand-text">Restriction:</strong> Request limitation of processing of your information</li>
                                <li><strong className="text-brand-text">Portability:</strong> Request transfer of your data to another service provider</li>
                                <li><strong className="text-brand-text">Objection:</strong> Object to processing based on legitimate interests or for direct marketing</li>
                                <li><strong className="text-brand-text">Withdraw Consent:</strong> Withdraw your consent at any time (without affecting prior lawful processing)</li>
                            </ul>
                            <p className="leading-relaxed mt-4">
                                To exercise any of these rights, please contact us at <a href="mailto:Peitho@anoteroslogos.com" className="text-brand-accent hover:underline">Peitho@anoteroslogos.com</a>. We will respond to your request within the timeframe required by applicable law.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                8. Security Measures
                            </h2>
                            <p className="leading-relaxed">
                                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption, secure servers, access controls, and regular security assessments. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                9. Children's Privacy
                            </h2>
                            <p className="leading-relaxed">
                                Our services are not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us immediately so we can delete it.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                10. Changes to This Privacy Policy
                            </h2>
                            <p className="leading-relaxed">
                                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by posting the updated policy on our website with a new "Last Updated" date. Your continued use of our services after such changes constitutes acceptance of the updated policy.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div>
                            <h2 className="font-display text-2xl font-semibold mb-4 text-brand-text">
                                11. Contact Us
                            </h2>
                            <p className="leading-relaxed mb-4">
                                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                            </p>
                            <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-xl p-6 space-y-2">
                                <p className="text-brand-text"><strong>Anóteros Lógos</strong></p>
                                <p>Email: <a href="mailto:Peitho@anoteroslogos.com" className="text-brand-accent hover:underline">Peitho@anoteroslogos.com</a></p>
                            </div>
                            <p className="leading-relaxed mt-4">
                                If you are located in the EEA, UK, or Switzerland, you also have the right to lodge a complaint with your local data protection authority.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-2xl p-8 text-center">
                            <p className="text-brand-text/80 leading-relaxed">
                                Thank you for trusting Anóteros Lógos with your information. We are committed to transparency, security, and respecting your privacy rights.
                            </p>
                        </div>
                    </AnimatedSection>
                </div>
            </div>
        </section>
    );
};

export default PrivacyPolicy;
