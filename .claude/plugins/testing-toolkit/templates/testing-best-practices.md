# Testing Best Practices

## Test Structure

### Arrange-Act-Assert Pattern
```javascript
describe('Calculator', () => {
  it('should add two numbers', () => {
    // Arrange
    const calculator = new Calculator();
    const a = 5;
    const b = 3;
    
    // Act
    const result = calculator.add(a, b);
    
    // Assert
    expect(result).toBe(8);
  });
});
```

## Test Types

### Unit Tests
- Test individual functions/methods
- Mock external dependencies
- Fast execution
- High code coverage

### Integration Tests
- Test component interactions
- Use real dependencies when possible
- Medium speed
- Catch interface issues

### End-to-End Tests
- Test complete user flows
- Use real environment
- Slower execution
- Catch real-world issues

## Best Practices

### 1. Write Descriptive Test Names
```javascript
// Bad
it('test1', () => {});

// Good
it('should return user data when valid ID is provided', () => {});
```

### 2. Keep Tests Independent
```javascript
// Bad - Tests depend on order
let user;
it('creates user', () => {
  user = createUser();
});
it('updates user', () => {
  updateUser(user); // Depends on previous test
});

// Good - Independent tests
it('creates user', () => {
  const user = createUser();
  expect(user).toBeDefined();
});
it('updates user', () => {
  const user = createUser();
  const updated = updateUser(user);
  expect(updated.name).toBe('New Name');
});
```

### 3. Use Test Fixtures
```javascript
const fixtures = {
  validUser: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com'
  },
  invalidUser: {
    id: null,
    name: '',
    email: 'invalid-email'
  }
};
```

### 4. Test Edge Cases
- Null/undefined inputs
- Empty arrays/strings
- Boundary values
- Error conditions
- Concurrent operations

### 5. Mock External Dependencies
```javascript
jest.mock('./api');
import { fetchUser } from './api';

it('handles API errors gracefully', async () => {
  fetchUser.mockRejectedValue(new Error('Network error'));
  
  const result = await getUserData(1);
  expect(result).toBeNull();
  expect(console.error).toHaveBeenCalled();
});
```

## Coverage Goals

### Recommended Targets
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

### Coverage Commands
```bash
# Jest
npm test -- --coverage

# pytest
pytest --cov=src --cov-report=html

# Go
go test -cover ./...
```

## Testing Frameworks

### JavaScript/TypeScript
- Jest - Most popular, great DX
- Mocha + Chai - Flexible, modular
- Vitest - Fast, Vite-native
- Cypress - E2E testing

### Python
- pytest - Simple, powerful
- unittest - Built-in
- nose2 - Extended unittest

### Go
- testing - Built-in
- testify - Assertions and mocks
- ginkgo - BDD style

## Continuous Testing

### Pre-commit Hooks
```bash
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: tests
        name: tests
        entry: npm test
        language: system
        pass_filenames: false
```

### CI/CD Integration
```yaml
# GitHub Actions
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test
```

## Performance Testing

### Load Testing
```javascript
import { check } from 'k6';
import http from 'k6/http';

export default function() {
  const res = http.get('https://api.example.com/users');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Benchmark Tests
```go
func BenchmarkFunction(b *testing.B) {
    for i := 0; i < b.N; i++ {
        MyFunction()
    }
}
```

## Test Data Management

### Factories
```javascript
const userFactory = {
  create: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    name: faker.name.fullName(),
    email: faker.internet.email(),
    ...overrides
  })
};
```

### Database Seeding
```javascript
beforeEach(async () => {
  await db.seed.run();
});

afterEach(async () => {
  await db.truncate();
});
```

## Debugging Tests

### Console Logging
```javascript
it('debug test', () => {
  const result = complexFunction();
  console.log('Result:', JSON.stringify(result, null, 2));
  expect(result).toMatchSnapshot();
});
```

### Interactive Debugging
```bash
# Node.js
node --inspect-brk node_modules/.bin/jest --runInBand

# Browser
debugger; // Add breakpoint in test
```

## Common Pitfalls

1. **Testing Implementation, Not Behavior**
2. **Over-mocking**
3. **Ignoring Flaky Tests**
4. **Not Testing Error Paths**
5. **Slow Test Suites**

## Resources
- [Testing Library](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [pytest Documentation](https://pytest.org/)