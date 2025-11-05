# Contributing to Anóteros Lógos

Thank you for your interest in contributing to the Anóteros Lógos platform. This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to professional standards of conduct:

- Be respectful and constructive
- Focus on technical merit
- Maintain confidentiality of proprietary information
- Follow security best practices

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Git 2.x or higher

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/DelovoyMotiv/anteroslogos.git
cd anteroslogos

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Project Structure

```
F:\air\
├── api/              # Serverless API endpoints
├── components/       # React components
├── pages/            # Route pages
├── lib/              # Core libraries (A2A Protocol)
├── utils/            # Utility modules
├── data/             # Content and data
├── public/           # Static assets
└── supabase/         # Database migrations
```

## Development Workflow

### Branch Strategy

We use Git Flow with the following branches:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Production hotfixes

### Creating a Feature Branch

```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push to remote
git push origin feature/your-feature-name
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public functions
- Avoid `any` - use `unknown` if type is truly unknown

**Example:**
```typescript
interface AuditResult {
  url: string;
  overallScore: number;
  grade: GradeLevel;
}

export function auditWebsite(url: string): Promise<AuditResult> {
  // Implementation
}
```

### React Components

- Use functional components with hooks
- Prefer named exports
- Use TypeScript for prop types
- Keep components focused and single-purpose

**Example:**
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `Header.tsx`)
- Utilities: `camelCase.ts` (e.g., `urlValidator.ts`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `API_ENDPOINTS`)
- Test files: `*.test.ts` or `*.test.tsx`

### Formatting

- Use Prettier for formatting (configured in project)
- 2 spaces for indentation
- Single quotes for strings
- Trailing commas in multi-line structures
- Max line length: 100 characters

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Build process or auxiliary tool changes
- `ci` - CI/CD configuration changes

### Examples

```bash
# Feature
git commit -m "feat(audit): add citation potential analysis"

# Bug fix
git commit -m "fix(api): handle rate limit edge case"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api)!: change A2A protocol response format

BREAKING CHANGE: audit.result now returns nested structure"
```

## Pull Request Process

### Before Submitting

1. **Update from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout your-branch
   git rebase develop
   ```

2. **Run checks**
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```

3. **Test your changes**
   - Manual testing in browser
   - Run any existing tests
   - Add new tests if applicable

4. **Update documentation**
   - Update README if needed
   - Add JSDoc comments for new functions
   - Update CHANGELOG.md

### PR Template

When creating a PR, include:

**Description:**
- What does this PR do?
- Why is this change needed?

**Changes:**
- List of modifications
- New files added
- Removed files

**Testing:**
- How was this tested?
- Screenshots (if UI changes)

**Checklist:**
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests added/updated
- [ ] Build passes

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No merge conflicts
4. Up-to-date with target branch

## Testing Requirements

### Current State (v2.0.0)

Testing coverage: **~3%** (needs improvement)

### Target Coverage

- Minimum: **25%** (MVP launch)
- Goal: **70%** (Enterprise ready)

### Testing Stack

- **Framework**: Vitest
- **React Testing**: @testing-library/react
- **E2E**: Playwright (planned)

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { validateUrl } from './urlValidator';

describe('urlValidator', () => {
  it('should validate correct URL', () => {
    const result = validateUrl('https://example.com');
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid URL', () => {
    const result = validateUrl('not-a-url');
    expect(result.isValid).toBe(false);
  });
});
```

### Priority Modules for Testing

1. `urlValidator.ts` - Security critical
2. `rateLimiter.ts` - Production stability
3. `cache.ts` - Performance critical
4. `adapter.ts` - A2A Protocol core

## Documentation

### JSDoc Comments

Add JSDoc for all public APIs:

```typescript
/**
 * Analyzes a website for GEO optimization
 * 
 * @param url - Website URL to analyze (must be valid HTTP/HTTPS)
 * @param options - Optional configuration for analysis depth
 * @returns Promise resolving to complete audit result
 * @throws {Error} If URL is invalid or analysis fails
 * 
 * @example
 * ```typescript
 * const result = await auditWebsite('https://example.com');
 * console.log(result.overallScore); // 85
 * ```
 */
export async function auditWebsite(
  url: string,
  options?: AuditOptions
): Promise<AuditResult> {
  // Implementation
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing configuration
- Updating dependencies
- Modifying deployment process

## Questions?

For questions or clarification:
- Open a GitHub Discussion
- Contact the development team
- Review existing documentation

## License

By contributing, you agree that your contributions will be licensed under the project's Proprietary license.
