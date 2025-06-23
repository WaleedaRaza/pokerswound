# Contributing to PokerSwound

Thank you for your interest in contributing to PokerSwound! This document provides guidelines and information for contributors.

## 🎯 Project Overview

PokerSwound is a real-time multiplayer Texas Hold'em poker application with a focus on cryptographically secure randomness and provable fairness. We're building this to address concerns about incomplete random algorithms in existing poker apps.

## 🏗️ Architecture

This is a monorepo with three main packages:
- **`shared/`** - Shared TypeScript types and utilities
- **`server/`** - Fastify backend with Socket.io and secure shuffling
- **`client/`** - React frontend with Vite and TailwindCSS

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Git

### Setup
1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/pokerswound.git
   cd pokerswound
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   cd server
   npx prisma db push
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## 🔧 Development Workflow

### Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/***: New features
- **bugfix/***: Bug fixes
- **hotfix/***: Critical production fixes

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

### Pull Request Process
1. **Create a feature branch** from `develop`
2. **Make your changes** following the coding standards
3. **Write tests** for new functionality
4. **Update documentation** if needed
5. **Submit a pull request** to `develop`
6. **Request review** from maintainers
7. **Address feedback** and make necessary changes
8. **Merge** after approval

## 📋 Issue Labels

### Type
- `enhancement`: New features
- `bug`: Bug fixes
- `documentation`: Documentation updates
- `question`: Questions or discussions

### Priority
- `P0`: Critical (security, core functionality)
- `P1`: High (user-facing features)
- `P2`: Medium (improvements, optimizations)
- `P3`: Low (nice-to-have features)

### Area
- `frontend`: Client-side work
- `backend`: Server-side work
- `shared`: Shared types/utilities
- `security`: Security-related changes
- `randomness`: Randomness/security features
- `ui/ux`: User interface improvements
- `testing`: Test-related work

## 🛠️ Coding Standards

### TypeScript
- Use strict mode
- Prefer interfaces over types for object shapes
- Use meaningful type names
- Avoid `any` - use proper typing

### React (Frontend)
- Use functional components with hooks
- Follow React best practices
- Use TypeScript for all components
- Implement proper error boundaries

### Node.js (Backend)
- Use async/await over callbacks
- Implement proper error handling
- Use TypeScript for all server code
- Follow Fastify best practices

### Security
- **Never use `Math.random()`** - always use `crypto.randomInt()`
- Validate all inputs server-side
- Implement proper authentication
- Follow OWASP guidelines

### Testing
- Write unit tests for critical functions
- Test randomness quality
- Test hand evaluation logic
- Test socket communication

## 🧪 Testing

### Running Tests
```bash
# All tests
npm run test

# Randomness testing
npm run test:randomness

# Type checking
npm run type-check

# Linting
npm run lint
```

### Test Structure
- **Unit tests**: Individual function testing
- **Integration tests**: API endpoint testing
- **Randomness tests**: Statistical validation
- **E2E tests**: Full user flow testing

## 📚 Documentation

### Code Documentation
- Use JSDoc for public functions
- Include examples for complex logic
- Document security considerations
- Explain randomness implementation

### API Documentation
- Document all endpoints
- Include request/response examples
- Document error codes
- Keep OpenAPI spec updated

### User Documentation
- Setup instructions
- Game rules explanation
- Security features explanation
- Troubleshooting guide

## 🔐 Security Guidelines

### Randomness
- Always use `crypto.randomInt()` for shuffling
- Implement provable fairness correctly
- Test randomness quality regularly
- Document security measures

### Input Validation
- Validate all client inputs
- Sanitize user data
- Implement rate limiting
- Use parameterized queries

### Authentication
- Implement proper session management
- Use secure cookies
- Validate room access
- Log security events

## 🎮 Game Logic

### Poker Rules
- Follow standard Texas Hold'em rules
- Implement proper hand evaluation
- Handle edge cases correctly
- Support multiple players

### Fairness
- Ensure unbiased shuffling
- Prevent cheating mechanisms
- Implement proper turn order
- Handle disconnections gracefully

## 🚀 Deployment

### Environment Variables
```bash
# Server
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
PORT=3000

# Client
VITE_API_URL="http://localhost:3000"
```

### Build Process
```bash
# Build all packages
npm run build

# Start production server
npm start
```

## 🤝 Community

### Communication
- Use GitHub Issues for discussions
- Join our Discord server
- Follow the code of conduct
- Be respectful and inclusive

### Code of Conduct
- Be respectful and inclusive
- Use welcoming and inclusive language
- Be collaborative and constructive
- Focus on what is best for the community

## 📞 Getting Help

### Resources
- [Project README](./README.md)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Fastify Documentation](https://www.fastify.io/docs/)
- [Socket.io Documentation](https://socket.io/docs/)

### Support
- Create an issue for bugs
- Start a discussion for questions
- Join our community channels
- Review existing issues first

## 🎯 First Contributions

### Good First Issues
- Documentation improvements
- UI component creation
- Test writing
- Bug fixes
- Performance optimizations

### Getting Started
1. Look for issues labeled `good first issue`
2. Comment on the issue to claim it
3. Follow the development workflow
4. Ask for help if needed

Thank you for contributing to PokerSwound! 🃏 