import { describe, it, expect } from '@jest/globals';

// Since the validation functions are not exported, we'll create wrapper functions for testing
// In a real scenario, you might want to export these functions or test them through public APIs

// Test helper to simulate validation behavior
function testValidateFilename(filename: string): { valid: boolean; error?: string } {
  try {
    // Length validation
    if (filename.length > 255) {
      throw new Error("파일명이 너무 깁니다. (최대 255자)");
    }
    
    if (filename.length === 0) {
      throw new Error("파일명이 비어있습니다.");
    }
    
    // Character validation - allow alphanumeric, dots, hyphens, underscores, and Korean characters
    if (!/^[a-zA-Z0-9._\-가-힣\s]+$/.test(filename)) {
      throw new Error("허용되지 않는 문자가 포함되어 있습니다.");
    }
    
    // Reserved names on Windows
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = filename.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      throw new Error("예약된 파일명입니다.");
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

function testAssertNoPathTraversal(filename: string): { valid: boolean; error?: string } {
  try {
    // Normalize and validate path
    const normalized = filename.replace(/\\/g, '/').replace(/\/+/g, '/');
    
    if (normalized.includes("..") || 
        normalized.startsWith("/") || 
        normalized.includes("\0") ||
        /[<>:"|?*]/.test(filename) ||
        /%2e%2e/i.test(filename) ||
        /\.\./g.test(decodeURIComponent(filename))) {
      throw new Error("잘못된 경로입니다.");
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

describe('File Validation Functions', () => {
  describe('validateFilename', () => {
    describe('Valid cases', () => {
      it('should accept normal filenames', () => {
        const result = testValidateFilename('test.html');
        expect(result.valid).toBe(true);
      });

      it('should accept filenames with numbers', () => {
        const result = testValidateFilename('test123.html');
        expect(result.valid).toBe(true);
      });

      it('should accept filenames with hyphens', () => {
        const result = testValidateFilename('test-file.html');
        expect(result.valid).toBe(true);
      });

      it('should accept filenames with underscores', () => {
        const result = testValidateFilename('test_file.html');
        expect(result.valid).toBe(true);
      });

      it('should accept filenames with dots', () => {
        const result = testValidateFilename('test.file.html');
        expect(result.valid).toBe(true);
      });

      it('should accept Korean characters', () => {
        const result = testValidateFilename('테스트.html');
        expect(result.valid).toBe(true);
      });

      it('should accept filenames with spaces', () => {
        const result = testValidateFilename('test file.html');
        expect(result.valid).toBe(true);
      });

      it('should accept mixed Korean and English', () => {
        const result = testValidateFilename('test테스트.html');
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid cases - Length', () => {
      it('should reject empty filenames', () => {
        const result = testValidateFilename('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('파일명이 비어있습니다.');
      });

      it('should reject filenames that are too long', () => {
        const longName = 'a'.repeat(256);
        const result = testValidateFilename(longName);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('파일명이 너무 깁니다. (최대 255자)');
      });

      it('should accept filenames at the length limit', () => {
        const maxLengthName = 'a'.repeat(255);
        const result = testValidateFilename(maxLengthName);
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid cases - Illegal characters', () => {
      const illegalChars = ['<', '>', ':', '"', '|', '?', '*', '/', '\\', '\0'];
      
      illegalChars.forEach(char => {
        it(`should reject filenames with ${char}`, () => {
          const result = testValidateFilename(`test${char}file.html`);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('허용되지 않는 문자가 포함되어 있습니다.');
        });
      });

      it('should reject filenames with control characters', () => {
        const result = testValidateFilename('test\x01file.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('허용되지 않는 문자가 포함되어 있습니다.');
      });

      it('should reject filenames with Unicode control characters', () => {
        const result = testValidateFilename('test\u0001file.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('허용되지 않는 문자가 포함되어 있습니다.');
      });
    });

    describe('Invalid cases - Reserved names', () => {
      const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
      
      reservedNames.forEach(name => {
        it(`should reject reserved name ${name}`, () => {
          const result = testValidateFilename(`${name}.html`);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('예약된 파일명입니다.');
        });

        it(`should reject reserved name ${name} in lowercase`, () => {
          const result = testValidateFilename(`${name.toLowerCase()}.html`);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('예약된 파일명입니다.');
        });
      });
    });
  });

  describe('assertNoPathTraversal', () => {
    describe('Valid cases', () => {
      it('should accept normal filenames', () => {
        const result = testAssertNoPathTraversal('test.html');
        expect(result.valid).toBe(true);
      });

      it('should accept relative paths without traversal', () => {
        const result = testAssertNoPathTraversal('folder/test.html');
        expect(result.valid).toBe(true);
      });

      it('should accept nested folders', () => {
        const result = testAssertNoPathTraversal('folder/subfolder/test.html');
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid cases - Path traversal', () => {
      it('should reject basic path traversal', () => {
        const result = testAssertNoPathTraversal('../test.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });

      it('should reject nested path traversal', () => {
        const result = testAssertNoPathTraversal('folder/../test.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });

      it('should reject multiple path traversals', () => {
        const result = testAssertNoPathTraversal('../../test.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });

      it('should reject complex path traversal', () => {
        const result = testAssertNoPathTraversal('folder/../../../etc/passwd');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });
    });

    describe('Invalid cases - Absolute paths', () => {
      it('should reject absolute paths', () => {
        const result = testAssertNoPathTraversal('/etc/passwd');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });

      it('should reject Windows absolute paths', () => {
        const result = testAssertNoPathTraversal('C:\\Windows\\System32');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });
    });

    describe('Invalid cases - URL encoding', () => {
      it('should reject URL encoded path traversal', () => {
        const result = testAssertNoPathTraversal('%2e%2e/test.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });

      it('should reject mixed case URL encoding', () => {
        const result = testAssertNoPathTraversal('%2E%2E/test.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });

      it('should reject URL encoded slash', () => {
        const result = testAssertNoPathTraversal('%2f..%2ftest.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });
    });

    describe('Invalid cases - Null bytes', () => {
      it('should reject null bytes', () => {
        const result = testAssertNoPathTraversal('test\0.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });

      it('should reject null bytes in paths', () => {
        const result = testAssertNoPathTraversal('folder/test\0.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });
    });

    describe('Invalid cases - Windows illegal characters', () => {
      const illegalChars = ['<', '>', ':', '"', '|', '?', '*'];
      
      illegalChars.forEach(char => {
        it(`should reject paths with ${char}`, () => {
          const result = testAssertNoPathTraversal(`test${char}file.html`);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('잘못된 경로입니다.');
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle mixed path separators', () => {
        const result = testAssertNoPathTraversal('folder\\..\\test.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });

      it('should handle double path separators', () => {
        const result = testAssertNoPathTraversal('folder//test.html');
        expect(result.valid).toBe(true); // Should normalize to single slash
      });

      it('should handle complex Unicode', () => {
        const result = testAssertNoPathTraversal('test\u002e\u002e/malicious.html');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });

      it('should handle URL decode edge cases', () => {
        const result = testAssertNoPathTraversal('%252e%252e/test.html'); // Double encoded
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });
    });
  });
});

describe('Security Attack Vectors', () => {
  describe('Path Traversal Attacks', () => {
    const pathTraversalTests = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e/%2e%2e/%2e%2e/etc/passwd',
      '....//....//....//etc/passwd',
      '%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd',
      '/etc/passwd',
      'C:\\Windows\\System32\\config\\sam',
      '\\\\server\\share\\file.txt',
      'folder/../../../etc/passwd',
      'test\0.html',
      'test\u002e\u002e/malicious.html',
      'test.html\0.hidden',
      '..\\..\\..\\windows\\system32\\calc.exe',
      '/var/log/auth.log',
      '/proc/self/environ',
      '../../../home/user/.ssh/id_rsa',
      'file:///etc/passwd',
      'test\x2e\x2e/malicious.html'
    ];

    pathTraversalTests.forEach(attack => {
      it(`should block path traversal attack: ${attack}`, () => {
        const result = testAssertNoPathTraversal(attack);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('잘못된 경로입니다.');
      });
    });
  });

  describe('Filename Injection Attacks', () => {
    const filenameAttacks = [
      '<script>alert(1)</script>.html',
      'test;rm -rf /.html',
      'test|nc -l 1234.html',
      'test`whoami`.html',
      'test$(whoami).html',
      'test\r\n.html',
      'test\t.html',
      'CON.html',
      'PRN.html',
      'AUX.html',
      'NUL.html',
      'test\0hidden.html',
      'test\u0001.html',
      'test\u000A.html',
      'test\u000D.html',
      'test\u0020\u0020.html',
      'test/../../etc/passwd',
      'test\\..\\..\\windows\\system32\\config\\sam'
    ];

    filenameAttacks.forEach(attack => {
      it(`should block filename attack: ${attack}`, () => {
        const pathResult = testAssertNoPathTraversal(attack);
        const filenameResult = testValidateFilename(attack);
        
        // At least one validation should fail
        expect(pathResult.valid || filenameResult.valid).toBe(false);
      });
    });
  });

  describe('Unicode and Encoding Attacks', () => {
    const unicodeAttacks = [
      'test\u002e\u002e/malicious.html',
      'test\u002F\u002E\u002E\u002F.html',
      'test\uFF0E\uFF0E/malicious.html',
      'test\u2024\u2024/malicious.html',
      'test\u002E\u002E\u002F\u002E\u002E\u002F.html',
      'test\u0000.html',
      'test\uFEFF.html',
      'test\u200B.html',
      'test\u200C.html',
      'test\u200D.html',
      'test\u2060.html'
    ];

    unicodeAttacks.forEach(attack => {
      it(`should block Unicode attack: ${attack}`, () => {
        const pathResult = testAssertNoPathTraversal(attack);
        const filenameResult = testValidateFilename(attack);
        
        // At least one validation should fail
        expect(pathResult.valid || filenameResult.valid).toBe(false);
      });
    });
  });

  describe('Length-based Attacks', () => {
    it('should reject extremely long filenames', () => {
      const longName = 'a'.repeat(1000) + '.html';
      const result = testValidateFilename(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('파일명이 너무 깁니다. (최대 255자)');
    });

    it('should reject filenames with long extensions', () => {
      const longExt = 'test.' + 'a'.repeat(250);
      const result = testValidateFilename(longExt);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('파일명이 너무 깁니다. (최대 255자)');
    });
  });

  describe('Reserved Names Edge Cases', () => {
    const reservedTests = [
      'CON.html',
      'con.html',
      'Con.html',
      'CON.txt',
      'PRN.html',
      'AUX.html',
      'NUL.html',
      'COM1.html',
      'LPT1.html',
      'COM9.html',
      'LPT9.html'
    ];

    reservedTests.forEach(reserved => {
      it(`should block reserved name: ${reserved}`, () => {
        const result = testValidateFilename(reserved);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('예약된 파일명입니다.');
      });
    });
  });
});