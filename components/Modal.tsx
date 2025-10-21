import React, { useState, useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      
      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements?.[0];
      const lastElement = focusableElements?.[focusableElements.length - 1];

      firstElement?.focus();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
        if (event.key === 'Tab') {
          if (!lastElement || !firstElement) return;
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      
      const timer = setTimeout(() => {
        if (!isOpen) {
            setIsSubmitted(false);
            setName('');
            setEmail('');
            setCompany('');
            setMessage('');
        }
      }, 300);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        previouslyFocusedElement.current?.focus();
        clearTimeout(timer);
      };

    }
  }, [isOpen, onClose]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!email.trim() || !validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // TODO: Replace with actual API endpoint
      // await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name, email, company, message })
      // });
      
      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log({ name, email, company, message });
      
      setIsSubmitting(false);
      setIsSubmitted(true);
      
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch {
      setIsSubmitting(false);
      setError('Something went wrong. Please try again.');
    }
  };
  
  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300 animate-fade-in-up"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div 
        className="bg-brand-bg/80 border border-brand-secondary rounded-xl p-8 md:p-10 w-full max-w-md relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent animate-gradient-pan" style={{ backgroundSize: '200%' }}></div>
        <button onClick={onClose} className="absolute top-4 right-4 text-brand-text/50 hover:text-brand-accent transition-colors" aria-label="Close dialogue">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {isSubmitted ? (
          <div className="text-center py-8">
            <h3 id="dialog-title" className="font-display text-2xl font-bold text-brand-accent">Thank You</h3>
            <p className="mt-2 text-brand-text/80">Your request has been received. We will be in touch shortly.</p>
          </div>
        ) : (
          <>
            <h3 id="dialog-title" className="font-display text-3xl font-bold text-center mb-6">Initiate Dialogue</h3>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="sr-only">Name</label>
                <input 
                  type="text" 
                  id="name" 
                  placeholder="Name*" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/30 border-b-2 border-brand-secondary focus:border-brand-accent rounded-t-md p-3 focus:outline-none transition-colors placeholder:text-brand-text/50"
                />
              </div>
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  placeholder="Email*" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/30 border-b-2 border-brand-secondary focus:border-brand-accent rounded-t-md p-3 focus:outline-none transition-colors placeholder:text-brand-text/50"
                />
              </div>
              <div>
                <label htmlFor="company" className="sr-only">Company</label>
                <input 
                  type="text" 
                  id="company" 
                  placeholder="Company" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-black/30 border-b-2 border-brand-secondary focus:border-brand-accent rounded-t-md p-3 focus:outline-none transition-colors placeholder:text-brand-text/50"
                />
              </div>
              <div>
                <label htmlFor="message" className="sr-only">Message</label>
                <textarea 
                  id="message" 
                  placeholder="Tell us about your project or goals..." 
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-black/30 border-b-2 border-brand-secondary focus:border-brand-accent rounded-t-md p-3 focus:outline-none transition-colors placeholder:text-brand-text/50 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-accent text-white font-bold py-3 rounded-md hover:bg-blue-500 transition-all disabled:bg-opacity-50 disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/40"
              >
                {isSubmitting ? 'Submitting...' : 'Request Consultation'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Modal;
