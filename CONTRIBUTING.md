# Contributing to Anóteros Lógos Website

Thank you for considering contributing to this project! This document provides guidelines for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/device information

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:
- Clear description of the enhancement
- Use case and benefits
- Any implementation ideas

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style
   - Add comments where necessary
   - Update documentation if needed
4. **Test your changes**
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```
5. **Commit your changes**
   ```bash
   git commit -m "feat: add new feature"
   ```
   Use conventional commit format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/anoteros-logos.git
cd anoteros-logos

# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build for production
npm run build
```

## Code Style

- **TypeScript**: Use strict typing
- **Components**: Use functional components with hooks
- **Naming**: 
  - Components: PascalCase
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
- **Imports**: Group and sort (React, external libs, internal modules)
- **Comments**: Use JSDoc for functions and complex logic

## Testing

Before submitting a PR:
- [ ] Code passes TypeScript compilation (`npm run typecheck`)
- [ ] Code passes linting (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Changes tested in multiple browsers
- [ ] Mobile responsiveness verified

## Documentation

Update documentation when:
- Adding new features
- Changing APIs
- Modifying configuration
- Adding dependencies

## Questions?

Feel free to open an issue for questions or discussions.

---

Thank you for contributing! 🚀
