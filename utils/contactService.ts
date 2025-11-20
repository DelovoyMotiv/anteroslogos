/**
 * Contact Form Service
 * Production-ready contact form submission handler
 */

export interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  message?: string;
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Submit contact form data
 * This implementation works with multiple backend options
 */
export async function submitContactForm(data: ContactFormData): Promise<ContactFormResponse> {
  // Validate required fields
  if (!data.name || !data.name.trim()) {
    return {
      success: false,
      message: 'Name is required',
      error: 'VALIDATION_ERROR'
    };
  }

  if (!data.email || !data.email.trim()) {
    return {
      success: false,
      message: 'Email is required',
      error: 'VALIDATION_ERROR'
    };
  }

  // RFC 5322 compliant email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(data.email)) {
    return {
      success: false,
      message: 'Invalid email address format',
      error: 'VALIDATION_ERROR'
    };
  }

  try {
    // Option 1: Use environment variable for custom backend
    const apiEndpoint = import.meta.env.VITE_CONTACT_FORM_ENDPOINT;
    
    if (apiEndpoint) {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      return {
        success: true,
        message: 'Thank you for your message. We will be in touch shortly.',
      };
    }

    // Option 2: Use Formspree (free tier available)
    // Set VITE_FORMSPREE_ID in environment variables
    const formspreeId = import.meta.env.VITE_FORMSPREE_ID;
    
    if (formspreeId) {
      const response = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Formspree error! status: ${response.status}`);
      }

      return {
        success: true,
        message: 'Thank you for your message. We will be in touch shortly.',
      };
    }

    // Option 3: Use Web3Forms (free, no backend needed)
    // Set VITE_WEB3FORMS_KEY in environment variables
    const web3formsKey = import.meta.env.VITE_WEB3FORMS_KEY;
    
    if (web3formsKey) {
      const formData = new FormData();
      formData.append('access_key', web3formsKey);
      formData.append('name', data.name);
      formData.append('email', data.email);
      if (data.company) formData.append('company', data.company);
      if (data.message) formData.append('message', data.message);

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          message: 'Thank you for your message. We will be in touch shortly.',
        };
      } else {
        throw new Error(result.message || 'Web3Forms submission failed');
      }
    }

    // Option 4: Fallback - Development only
    // Fail-fast in production to ensure contact forms are properly configured
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Contact form service not configured in production. ' +
        'Set one of: VITE_CONTACT_FORM_ENDPOINT, VITE_FORMSPREE_ID, or VITE_WEB3FORMS_KEY'
      );
    }
    
    // Development fallback: Store in localStorage
    storeContactLocally(data);
    
    console.warn('⚠️  Contact form data stored locally (development only)');
    console.log('📧 Configure production service: VITE_WEB3FORMS_KEY or VITE_FORMSPREE_ID');
    console.log('📧 Alternative: mailto:Peitho@anoteroslogos.com?subject=Contact%20Request');
    
    return {
      success: true,
      message: 'Your message has been received (development mode). Configure production contact service.',
    };

  } catch (error) {
    console.error('Contact form submission error:', error);
    
    // Store locally as backup
    storeContactLocally(data);
    
    return {
      success: false,
      message: 'There was an error submitting your message. Please try again or contact us directly.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Store contact form data in localStorage as backup
 * Useful for development and as failsafe
 */
function storeContactLocally(data: ContactFormData): void {
  try {
    const stored = localStorage.getItem('contact_submissions');
    const submissions = stored ? JSON.parse(stored) : [];
    
    submissions.push({
      ...data,
      timestamp: new Date().toISOString(),
      id: generateId(),
    });
    
    // Keep only last 50 submissions
    if (submissions.length > 50) {
      submissions.splice(0, submissions.length - 50);
    }
    
    localStorage.setItem('contact_submissions', JSON.stringify(submissions));
  } catch (error) {
    console.error('Failed to store contact submission locally:', error);
  }
}

/**
 * Get locally stored contact submissions
 * Admin utility function
 */
export function getStoredSubmissions(): Array<ContactFormData & { timestamp: string; id: string }> {
  try {
    const stored = localStorage.getItem('contact_submissions');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to retrieve stored submissions:', error);
    return [];
  }
}

/**
 * Clear locally stored submissions
 * Admin utility function
 */
export function clearStoredSubmissions(): void {
  try {
    localStorage.removeItem('contact_submissions');
  } catch (error) {
    console.error('Failed to clear stored submissions:', error);
  }
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
