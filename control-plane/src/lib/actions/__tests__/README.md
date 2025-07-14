# File Security Tests

This directory contains comprehensive security tests for the file handling functions in the application.

## Test Files

### `file.test.ts`
Main integration tests for all file operations:
- `saveFile()` - Save/edit file content
- `deleteFile()` - Delete files and directories
- `renameFile()` - Rename files with security validation
- `uploadFile()` - Upload files with size and type validation
- `createDirectory()` - Create new directories
- `createFile()` - Create new empty files

### `file-validation.test.ts`
Focused unit tests for validation functions:
- `validateFilename()` - Filename validation logic
- `assertNoPathTraversal()` - Path traversal prevention
- Security attack vector tests

## Test Categories

### 1. Correct Cases
Tests that verify normal, expected functionality:
- Valid filenames with various characters
- Proper file extensions
- Normal directory structures
- Korean character support
- Valid file sizes

### 2. Edge Cases
Tests that verify boundary conditions:
- Maximum filename length (255 characters)
- Empty inputs
- Files at size limits (10MB)
- Unicode characters
- Mixed character sets

### 3. Malicious Cases
Tests that verify security protections:
- Path traversal attacks (`../../../etc/passwd`)
- URL encoding attacks (`%2e%2e/malicious`)
- Null byte injection (`test\0.html`)
- Reserved filename attacks (`CON.html`, `PRN.html`)
- Script injection attempts (`<script>alert(1)</script>.html`)
- Long filename attacks (>255 characters)
- Unicode normalization attacks

## Security Vulnerabilities Tested

### Path Traversal Protection
- Basic traversal: `../../../etc/passwd`
- URL encoded: `%2e%2e/malicious.html`
- Unicode: `\u002e\u002e/malicious.html`
- Mixed separators: `folder\\..\\malicious.html`
- Absolute paths: `/etc/passwd`

### Filename Validation
- Length limits (255 characters)
- Character restrictions (alphanumeric, Korean, dots, hyphens, underscores)
- Reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
- Null bytes and control characters
- Script injection attempts

### Input Sanitization
- Directory path length limits (1000 characters)
- File size limits (10MB)
- Extension validation
- MIME type checking

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test file.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Structure

Each test follows this pattern:
1. **Setup** - Mock dependencies and authentication
2. **Execute** - Call the function with test data
3. **Assert** - Verify the expected behavior

### Authentication Tests
All functions require authentication:
```javascript
it('should require authentication', async () => {
  mockValidateRequest.mockResolvedValue({ user: null, session: null });
  const result = await functionUnderTest();
  expect(result.success).toBe(false);
  expect(result.message).toBe('로그인이 필요합니다.');
});
```

### Security Tests
Security validations are tested extensively:
```javascript
it('should reject path traversal attacks', async () => {
  const result = await functionUnderTest('../../../etc/passwd');
  expect(result.success).toBe(false);
  expect(result.message).toBe('잘못된 경로입니다.');
});
```

### Error Handling Tests
AWS S3 and other external service failures:
```javascript
it('should handle S3 errors gracefully', async () => {
  mockS3Client.send.mockRejectedValue(new Error('S3 Error'));
  const result = await functionUnderTest();
  expect(result.success).toBe(false);
  expect(result.message).toBe('Expected error message');
});
```

## Coverage Goals

The tests aim for:
- **100%** statement coverage for validation functions
- **100%** branch coverage for security checks
- **95%+** overall function coverage
- All error paths tested
- All security vulnerabilities covered

## Security Attack Vectors Covered

1. **Path Traversal**: 18 different attack patterns
2. **Filename Injection**: 16 different attack patterns  
3. **Unicode Attacks**: 10 different encoding attacks
4. **Length Attacks**: Buffer overflow attempts
5. **Reserved Names**: Windows reserved filename attacks
6. **Control Characters**: Null bytes and control chars

## Continuous Security Testing

These tests should be run:
- On every code change (CI/CD)
- Before security releases
- During penetration testing
- As part of compliance audits

## Adding New Tests

When adding new file operations:
1. Add integration tests in `file.test.ts`
2. Add validation tests in `file-validation.test.ts`
3. Include all three test categories (correct, edge, malicious)
4. Update this documentation

## Security Considerations

These tests verify that the application:
- Prevents directory traversal attacks
- Validates all user inputs
- Sanitizes filenames and paths
- Enforces size and type restrictions
- Handles errors gracefully
- Maintains security under all conditions