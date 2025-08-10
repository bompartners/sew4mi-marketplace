# Contributing to Sew4Mi

Thank you for your interest in contributing to Sew4Mi! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sew4mi
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment**

   ```bash
   cp .env.example .env.local
   # Fill in the required environment variables
   ```

4. **Run development server**
   ```bash
   pnpm dev
   ```

## Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards (ESLint + Prettier)
   - Write tests for new functionality
   - Update documentation as needed

3. **Test your changes**

   ```bash
   pnpm test
   pnpm test:e2e
   pnpm lint
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Follow [conventional commits](https://www.conventionalcommits.org/) format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for code formatting
   - `refactor:` for code refactoring
   - `test:` for test changes
   - `chore:` for build/tooling changes

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use JSDoc comments for public functions

### React

- Use functional components with hooks
- Follow the established component patterns
- Use Tailwind CSS for styling

### File Organization

```
apps/web/
├── app/                    # Next.js App Router pages
├── components/
│   ├── ui/                 # Reusable UI components
│   └── features/           # Feature-specific components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and configurations
└── tests/                  # Test files
```

### Naming Conventions

- Components: PascalCase (`UserProfile.tsx`)
- Hooks: camelCase with 'use' prefix (`useAuth.ts`)
- Files: kebab-case for non-components (`api-client.ts`)
- Constants: SCREAMING_SNAKE_CASE

## Testing Guidelines

- Write unit tests for utilities and business logic
- Write component tests for UI components
- Write integration tests for complex workflows
- Write E2E tests for critical user journeys

### Test Structure

```typescript
describe('Component/Function Name', () => {
  it('should do something specific', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Pull Request Guidelines

1. **Fill out the PR template**
2. **Ensure all checks pass**
   - Linting
   - Tests
   - Build
3. **Request review** from maintainers
4. **Address feedback** promptly
5. **Keep PRs focused** - one feature per PR

## Code Review Process

- All changes require review from at least one maintainer
- Reviews should be constructive and helpful
- Address all feedback before merging
- Maintainers will handle the final merge

## Getting Help

- Create an issue for bugs or feature requests
- Join our community discussions
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
