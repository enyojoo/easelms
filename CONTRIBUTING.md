# Contributing to EaseLMS

Thank you for your interest in contributing to EaseLMS! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We are committed to providing a welcoming and inspiring community for all.

## How to Contribute

### Reporting Bugs

- Use the GitHub issue tracker
- Include clear steps to reproduce the issue
- Describe expected vs actual behavior
- Include environment details (OS, Node version, browser, etc.)
- Add screenshots or error messages if applicable
- Use the bug report template when creating an issue

### Suggesting Features

- Open a GitHub discussion or issue
- Describe the use case and problem it solves
- Explain the proposed solution
- Consider implementation complexity
- Use the feature request template when creating an issue

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
   - Follow the code style guidelines
   - Write or update tests if applicable
   - Update documentation as needed
4. **Test your changes**
   - Run the development server
   - Test the functionality you've added/modified
   - Ensure existing tests still pass
5. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
   - Use clear, descriptive commit messages
   - Reference related issues if applicable
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**
   - Provide a clear description of changes
   - Reference related issues
   - Add screenshots for UI changes

## Development Guidelines

### Code Style

- **TypeScript**: Follow TypeScript best practices
- **Naming**: Use meaningful variable and function names
- **Comments**: Add comments for complex logic
- **Formatting**: Use the project's ESLint and Prettier configuration
- **Self-documenting**: Write code that explains itself

### Project Structure

- Follow the existing folder structure
- Place components in appropriate directories
- Keep files focused and single-purpose
- Use TypeScript for all new files

### TypeScript Guidelines

- Use proper types for all variables and functions
- Avoid `any` types when possible
- Use interfaces for object shapes
- Leverage TypeScript's type inference where appropriate

### Component Guidelines

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use the shadcn/ui component library for UI elements

### Testing

- Write tests for new features when possible
- Ensure existing tests pass before submitting PR
- Test edge cases and error scenarios
- Test responsive design on different screen sizes

### Git Commit Messages

Use clear, descriptive commit messages:

```
feat: Add course progress tracking
fix: Resolve video playback issue on mobile
docs: Update installation guide
refactor: Simplify payment processing logic
style: Format code with Prettier
test: Add tests for certificate generation
```

### Pull Request Guidelines

- Keep PRs focused and small when possible
- Provide clear description of changes
- Include screenshots for UI changes
- Reference related issues
- Ensure CI checks pass
- Request review from maintainers

## Getting Started

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/easelms.git
   cd easelms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local` (if available)
   - Fill in required environment variables

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Run linting**
   ```bash
   npm run lint
   ```

## Development Workflow

1. Create an issue to discuss major changes
2. Fork the repository
3. Create a feature branch from `main`
4. Make your changes
5. Test thoroughly
6. Submit a pull request
7. Address review feedback
8. Once approved, maintainers will merge

## Questions?

- Open a GitHub Discussion for general questions
- Check existing issues and discussions
- Review the documentation
- Ask in the community Discord (if available)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to EaseLMS! 🎉
