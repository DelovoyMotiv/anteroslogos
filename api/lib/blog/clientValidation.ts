/**
 * Client-side validation utilities for Blog CMS forms
 */

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate required fields
 */
export function validateRequired(
  value: any,
  fieldName: string
): string | null {
  if (value === undefined || value === null) {
    return `${fieldName} is required`;
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return `${fieldName} is required`;
  }

  if (typeof value === 'number' && value <= 0) {
    return `${fieldName} must be a positive number`;
  }

  return null;
}

/**
 * Validate slug format
 * Slug should only contain lowercase letters, numbers, and hyphens
 */
export function validateSlug(slug: string): string | null {
  if (!slug || slug.trim().length === 0) {
    return 'Slug is required';
  }

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
  if (!slugRegex.test(slug)) {
    return 'Slug must contain only lowercase letters, numbers, and hyphens';
  }

  if (slug.length > 100) {
    return 'Slug must be less than 100 characters';
  }

  return null;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, fieldName: string): string | null {
  if (!url || url.trim().length === 0) {
    return null; // Allow empty URLs
  }

  try {
    const urlObj = new URL(url);
    
    // Check for valid protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return `${fieldName} must use HTTP or HTTPS protocol`;
    }

    return null;
  } catch {
    return `${fieldName} must be a valid URL`;
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return null; // Allow empty emails
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return 'Email must be a valid email address';
  }

  return null;
}

/**
 * Validate text length
 */
export function validateLength(
  value: string,
  fieldName: string,
  min?: number,
  max?: number
): string | null {
  const length = value?.trim().length || 0;

  if (min !== undefined && length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }

  if (max !== undefined && length > max) {
    return `${fieldName} must be less than ${max} characters`;
  }

  return null;
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  fieldName: string,
  min?: number,
  max?: number
): string | null {
  if (min !== undefined && value < min) {
    return `${fieldName} must be at least ${min}`;
  }

  if (max !== undefined && value > max) {
    return `${fieldName} must be at most ${max}`;
  }

  return null;
}

/**
 * Validate blog post form
 */
export function validateBlogPostForm(data: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author_id: string;
  read_time: number;
  og_image_url?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate title
  const titleError = validateRequired(data.title, 'Title');
  if (titleError) {
    errors.title = titleError;
  } else {
    const lengthError = validateLength(data.title, 'Title', 1, 200);
    if (lengthError) errors.title = lengthError;
  }

  // Validate slug
  const slugError = validateSlug(data.slug);
  if (slugError) {
    errors.slug = slugError;
  }

  // Validate excerpt
  const excerptError = validateRequired(data.excerpt, 'Excerpt');
  if (excerptError) {
    errors.excerpt = excerptError;
  } else {
    const lengthError = validateLength(data.excerpt, 'Excerpt', 10, 500);
    if (lengthError) errors.excerpt = lengthError;
  }

  // Validate content
  const contentError = validateRequired(data.content, 'Content');
  if (contentError) {
    errors.content = contentError;
  } else {
    const lengthError = validateLength(data.content, 'Content', 50);
    if (lengthError) errors.content = lengthError;
  }

  // Validate author
  const authorError = validateRequired(data.author_id, 'Author');
  if (authorError) {
    errors.authorId = authorError;
  }

  // Validate read time
  const readTimeError = validateRequired(data.read_time, 'Read time');
  if (readTimeError) {
    errors.readTime = readTimeError;
  } else {
    const rangeError = validateRange(data.read_time, 'Read time', 1);
    if (rangeError) errors.readTime = rangeError;
  }

  // Validate OG image URL if provided
  if (data.og_image_url) {
    const urlError = validateUrl(data.og_image_url, 'OG image URL');
    if (urlError) {
      errors.ogImageUrl = urlError;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate author form
 */
export function validateAuthorForm(data: {
  name: string;
  slug: string;
  email?: string;
  image_url?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate name
  const nameError = validateRequired(data.name, 'Name');
  if (nameError) {
    errors.name = nameError;
  } else {
    const lengthError = validateLength(data.name, 'Name', 1, 100);
    if (lengthError) errors.name = lengthError;
  }

  // Validate slug
  const slugError = validateSlug(data.slug);
  if (slugError) {
    errors.slug = slugError;
  }

  // Validate email if provided
  if (data.email) {
    const emailError = validateEmail(data.email);
    if (emailError) {
      errors.email = emailError;
    }
  }

  // Validate image URL if provided
  if (data.image_url) {
    const urlError = validateUrl(data.image_url, 'Image URL');
    if (urlError) {
      errors.imageUrl = urlError;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate category form
 */
export function validateCategoryForm(data: {
  name: string;
  slug: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate name
  const nameError = validateRequired(data.name, 'Name');
  if (nameError) {
    errors.name = nameError;
  } else {
    const lengthError = validateLength(data.name, 'Name', 1, 100);
    if (lengthError) errors.name = lengthError;
  }

  // Validate slug
  const slugError = validateSlug(data.slug);
  if (slugError) {
    errors.slug = slugError;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Generate slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}
