# Contributing to Entropoker

Thank you for your interest in contributing to Entropoker! This document provides guidelines and information for contributors.

## 🎯 Project Goals

Entropoker aims to be the most fair, secure, and transparent online poker platform by:

1. **Entropy-Secure Shuffling**: Using external, public entropy sources for truly random deck shuffling
2. **Provable Fairness**: Implementing cryptographic proofs of game fairness
3. **Open Source**: Building in the open with community contributions
4. **Scalable Architecture**: Designing for growth from MVP to enterprise

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- Git

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd entropoker

# Install dependencies
npm install

# Set up environment
cp env.example .env
# Edit .env with your configuration

# Set up database
npx prisma generate
npx prisma db push

# Start development
npm run dev
```

## 📋 Issue Guidelines

### Bug Reports
When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

### Feature Requests
For feature requests, please include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation approach (if you have ideas)
- Priority level (low/medium/high)

### Issue Labels
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority: high/medium/low`: Issue priority

## 🔧 Development Workflow

### Branch Naming
- `feature/description`: New features
- `fix/description`: Bug fixes
- `docs/description`: Documentation changes
- `refactor/description`: Code refactoring

### Commit Messages
Use conventional commits format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(game-engine): add hand evaluation logic
fix(entropy-core): resolve Twitch API timeout issue
docs(readme): update installation instructions
```

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following the coding standards
3. **Write/update tests** for your changes
4. **Update documentation** if needed
5. **Run the test suite** and ensure all tests pass
6. **Submit a pull request** with a clear description

### PR Guidelines
- Provide a clear title and description
- Reference related issues
- Include screenshots for UI changes
- Ensure all CI checks pass
- Request reviews from maintainers

## 🧪 Testing

### Running Tests
```bash
# All tests
npm test

# Specific package
npm test --workspace=@entropoker/game-engine

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Writing Tests
- Use Jest as the testing framework
- Write unit tests for all new functionality
- Aim for >80% code coverage
- Test both success and error cases
- Use descriptive test names

### Test Structure
```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## 📝 Code Standards

### TypeScript
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use meaningful type names
- Avoid `any` type - use proper typing

### Code Style
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use trailing commas in objects and arrays
- Maximum line length: 100 characters

### Naming Conventions
- `camelCase` for variables and functions
- `PascalCase` for classes and interfaces
- `UPPER_SNAKE_CASE` for constants
- `kebab-case` for files and directories

### Documentation
- Use JSDoc for public APIs
- Include examples in documentation
- Keep README files up to date
- Document complex algorithms

## 🏗️ Architecture Guidelines

### Modularity
- Keep modules focused and single-purpose
- Use dependency injection where appropriate
- Minimize coupling between modules
- Export clear, stable APIs

### Error Handling
- Use proper error types
- Provide meaningful error messages
- Log errors appropriately
- Handle edge cases gracefully

### Performance
- Consider performance implications
- Use efficient algorithms
- Avoid unnecessary computations
- Profile critical paths

## 🔐 Security Guidelines

### Entropy Security
- Never expose entropy sources directly
- Validate entropy quality
- Use cryptographically secure RNG
- Log entropy usage for auditability

### Data Protection
- Sanitize user inputs
- Use parameterized queries
- Validate data at boundaries
- Follow OWASP guidelines

## 📚 Documentation

### Code Documentation
- Document complex functions
- Include usage examples
- Explain business logic
- Keep documentation current

### API Documentation
- Document all public APIs
- Include request/response examples
- Specify error conditions
- Use OpenAPI/Swagger for REST APIs

## 🚀 Release Process

### Versioning
We use semantic versioning (SemVer):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes written
- [ ] Tagged and pushed

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Help newcomers
- Provide constructive feedback
- Follow the project's code of conduct

### Communication
- Use GitHub issues for discussions
- Be clear and concise
- Ask questions when unsure
- Share knowledge and insights

## 📞 Getting Help

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for general questions
- **Documentation**: Check the README and inline docs first

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes
- Project documentation
- Community acknowledgments

Thank you for contributing to Entropoker! 🃏 