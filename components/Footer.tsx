import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from './Icons';

interface FooterProps {
  onPhilosophyClick?: () => void;
  onMethodClick?: () => void;
  onClientsClick?: () => void;
  onFAQClick?: () => void;
  onContactClick?: () => void;
}

const Footer: React.FC<FooterProps> = () => {
  const navigate = useNavigate();

  const productLinks = [
    { label: 'Method', to: '/method' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Blog', to: '/blog' },
    { label: 'Knowledge Base', to: '/knowledge-base' },
  ];

  const companyLinks = [
    { label: 'Agent Identity', to: '/agent-identity' },
    { label: 'Privacy Policy', to: '/privacy-policy' },
    { label: 'Cookie Policy', to: '/cookie-policy' },
  ];

  const socialLinks = [
    {
      name: 'LinkedIn',
      href: 'https://www.linkedin.com/in/nadezhda-nikolaeva-31a321397/',
      icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    },
    {
      name: 'X',
      href: 'https://x.com/anoteroslogos',
      icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    },
  ];

  return (
    <footer className="relative z-10 bg-brand-bg border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main footer content */}
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">

            {/* Brand column */}
            <div className="md:col-span-5">
              <button
                onClick={() => navigate('/')}
                className="group flex items-center gap-2.5 mb-4"
              >
                <Logo className="h-7 w-7 flex-shrink-0" />
                <span className="font-display text-xl font-semibold tracking-tight text-brand-text/90">
                  Anóteros Lógos
                </span>
              </button>
              <p className="text-sm text-brand-text/40 leading-relaxed max-w-sm mb-5">
                Encoding expertise into the foundational logic of AI.
              </p>
              <p className="text-xs text-brand-accent/70 font-mono">
                Don't rank. Become the source.
              </p>
            </div>

            {/* Product links */}
            <div className="md:col-span-3">
              <h4 className="text-xs font-semibold text-brand-text/30 uppercase tracking-widest mb-4">
                Product
              </h4>
              <ul className="space-y-2.5">
                {productLinks.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-brand-text/55 hover:text-brand-text transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-semibold text-brand-text/30 uppercase tracking-widest mb-4">
                Company
              </h4>
              <ul className="space-y-2.5">
                {companyLinks.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-brand-text/55 hover:text-brand-text transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-semibold text-brand-text/30 uppercase tracking-widest mb-4">
                Social
              </h4>
              <div className="flex gap-3">
                {socialLinks.map(social => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    className="group w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-brand-accent/30 flex items-center justify-center transition-all duration-200 hover:bg-brand-accent/5"
                  >
                    <svg
                      className="w-4 h-4 text-brand-text/40 group-hover:text-brand-accent transition-colors duration-200"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d={social.icon} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.04] py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-brand-text/25">
            &copy; {new Date().getFullYear()} Anóteros Lógos. All rights reserved.
          </p>
          <p className="text-xs text-brand-text/20 font-mono italic">
            The Nicosia Method™
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
