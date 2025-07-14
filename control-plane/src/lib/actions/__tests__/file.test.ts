import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  saveFile, 
  deleteFile, 
  renameFile, 
  uploadFile, 
  createDirectory, 
  createFile 
} from '../file';

// Mock dependencies
const mockValidateRequest = jest.fn();
jest.mock('../../auth', () => ({
  validateRequest: mockValidateRequest
}));

jest.mock('lucia', () => ({
  generateId: jest.fn((length) => 'mock-id-' + length)
}));

jest.mock('@lucia-auth/adapter-postgresql', () => ({
  NodePostgresAdapter: jest.fn().mockImplementation(() => ({
    getSession: jest.fn(),
    setSession: jest.fn(),
    deleteSession: jest.fn(),
    getUser: jest.fn(),
    setUser: jest.fn(),
    deleteUser: jest.fn()
  }))
}));

jest.mock('../../database', () => ({
  db: {
    updateTable: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          execute: jest.fn()
        }))
      }))
    }))
  }
}));

const mockS3Send = jest.fn();
jest.mock('../../utils', () => ({
  getUserHomeDirectory: jest.fn((loginName: string) => `users/${loginName}`),
  s3Client: {
    send: mockS3Send
  }
}));

jest.mock('../../const', () => ({
  ALLOWED_FILE_EXTENSIONS: ['html', 'css', 'js', 'txt', 'md', 'json'],
  EDITABLE_FILE_EXTENSIONS: ['html', 'css', 'js', 'txt', 'md', 'json'],
  FILE_EXTENSION_MIMETYPE_MAP: {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json'
  },
  DEFAULT_INDEX_HTML: '<!DOCTYPE html><html><head><title>Default</title></head><body><h1>Hello</h1></body></html>'
}));

const mockRevalidatePath = jest.fn();
jest.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn()
}));

// Import mocked dependencies

// Mock user
const mockUser = {
  id: 1,
  loginName: 'testuser',
  email: 'test@example.com',
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  discoverable: true,
  homeDirectorySizeBytes: 0,
  homeDirectorySizeBytesUpdatedAt: null,
  passwordHash: 'hashed',
  siteRenderedAt: null,
  siteUpdatedAt: null
};

// Mock environment variables
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.CLOUDFLARE_ZONE_ID = 'test-zone';
process.env.CLOUDFLARE_USER_API_TOKEN = 'test-token';

describe('File Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateRequest.mockResolvedValue({ user: mockUser, session: null });
    mockS3Send.mockResolvedValue({});
    mockRevalidatePath.mockImplementation(() => {});
    
    // Mock fetch for Cloudflare API
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateFilename', () => {
    // We need to test this indirectly through the functions that use it
    
    it('should accept valid filenames', async () => {
      const result = await saveFile('test.html', '<h1>Test</h1>');
      expect(result.success).toBe(true);
    });

    it('should accept Korean characters in filenames', async () => {
      const result = await saveFile('테스트.html', '<h1>Test</h1>');
      expect(result.success).toBe(true);
    });

    it('should reject empty filenames', async () => {
      const result = await saveFile('', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('파일명이 비어있습니다.');
    });

    it('should reject filenames that are too long', async () => {
      const longName = 'a'.repeat(256) + '.html';
      const result = await saveFile(longName, '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('파일명이 너무 깁니다. (최대 255자)');
    });

    it('should reject filenames with illegal characters', async () => {
      const result = await saveFile('test<script>.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('허용되지 않는 문자가 포함되어 있습니다.');
    });

    it('should reject reserved Windows filenames', async () => {
      const result = await saveFile('CON.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('예약된 파일명입니다.');
    });

    it('should reject filenames with null bytes', async () => {
      const result = await saveFile('test\0.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should reject filenames with path traversal', async () => {
      const result = await saveFile('../test.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should reject filenames with URL encoded path traversal', async () => {
      const result = await saveFile('%2e%2e/test.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });
  });

  describe('assertNoPathTraversal', () => {
    it('should reject basic path traversal', async () => {
      const result = await saveFile('../test.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should reject absolute paths', async () => {
      const result = await saveFile('/etc/passwd', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should reject URL encoded path traversal', async () => {
      const result = await saveFile('%2e%2e%2ftest.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should reject paths with null bytes', async () => {
      const result = await saveFile('test\0.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should reject paths with Windows illegal characters', async () => {
      const result = await saveFile('test<file>.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should accept valid paths', async () => {
      const result = await saveFile('folder/test.html', '<h1>Test</h1>');
      expect(result.success).toBe(true);
    });
  });

  describe('saveFile', () => {
    it('should save valid files successfully', async () => {
      const result = await saveFile('test.html', '<h1>Hello World</h1>');
      expect(result.success).toBe(true);
      expect(result.message).toBe('파일이 저장되었습니다.');
    });

    it('should require authentication', async () => {
      mockValidateRequest.mockResolvedValue({ user: null, session: null });
      const result = await saveFile('test.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('로그인이 필요합니다.');
    });

    it('should reject non-editable file extensions', async () => {
      const result = await saveFile('test.exe', 'malicious content');
      expect(result.success).toBe(false);
      expect(result.message).toContain('지원하지 않는 파일 형식입니다.');
    });

    it('should handle S3 errors gracefully', async () => {
      mockS3Send.mockRejectedValue(new Error('S3 Error'));
      const result = await saveFile('test.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('파일 저장에 실패했습니다.');
    });
  });

  describe('renameFile', () => {
    it('should rename files successfully', async () => {
      const result = await renameFile('old.html', 'new.html');
      expect(result.success).toBe(true);
      expect(result.message).toBe('파일 이름이 변경되었습니다.');
    });

    it('should require authentication', async () => {
      mockValidateRequest.mockResolvedValue({ user: null, session: null });
      const result = await renameFile('old.html', 'new.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('로그인이 필요합니다.');
    });

    it('should prevent renaming index.html', async () => {
      const result = await renameFile('/index.html', 'homepage.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('홈 페이지 이름은 변경할 수 없습니다.');
    });

    it('should validate both old and new filenames', async () => {
      const result = await renameFile('old.html', '../malicious.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should handle S3 errors gracefully', async () => {
      mockS3Send.mockRejectedValue(new Error('S3 Error'));
      const result = await renameFile('old.html', 'new.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('파일 이름 변경에 실패했습니다.');
    });
  });

  describe('uploadFile', () => {
    const createMockFile = (name: string, size: number = 1000, content: string = 'test') => {
      const file = new File([content], name, { type: 'text/html' });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('should upload valid files successfully', async () => {
      const formData = new FormData();
      formData.append('directory', 'test/');
      formData.append('file', createMockFile('test.html'));
      
      const result = await uploadFile(null, formData);
      expect(result.success).toBe(true);
      expect(result.message).toBe('업로드되었습니다.');
    });

    it('should require authentication', async () => {
      mockValidateRequest.mockResolvedValue({ user: null, session: null });
      const formData = new FormData();
      formData.append('directory', 'test/');
      formData.append('file', createMockFile('test.html'));
      
      const result = await uploadFile(null, formData);
      expect(result.message).toBe('로그인이 필요합니다.');
    });

    it('should reject empty files', async () => {
      const formData = new FormData();
      formData.append('directory', 'test/');
      formData.append('file', createMockFile('empty.html', 0));
      
      const result = await uploadFile(null, formData);
      expect(result.message).toBe('빈 파일은 업로드할 수 없습니다.');
    });

    it('should reject files that are too large', async () => {
      const formData = new FormData();
      formData.append('directory', 'test/');
      formData.append('file', createMockFile('large.html', 11 * 1024 * 1024)); // 11MB
      
      const result = await uploadFile(null, formData);
      expect(result.message).toBe('10MB 이하의 파일만 업로드할 수 있습니다.');
    });

    it('should reject disallowed file extensions', async () => {
      const formData = new FormData();
      formData.append('directory', 'test/');
      formData.append('file', createMockFile('malicious.exe'));
      
      const result = await uploadFile(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain('지원하지 않는 파일 형식입니다.');
    });

    it('should validate directory path', async () => {
      const formData = new FormData();
      formData.append('directory', '../../../etc/');
      formData.append('file', createMockFile('test.html'));
      
      const result = await uploadFile(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should reject directories that are too long', async () => {
      const formData = new FormData();
      formData.append('directory', 'a'.repeat(1001));
      formData.append('file', createMockFile('test.html'));
      
      const result = await uploadFile(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toBe('디렉토리 경로가 너무 깁니다.');
    });

    it('should require at least one file', async () => {
      const formData = new FormData();
      formData.append('directory', 'test/');
      
      const result = await uploadFile(null, formData);
      expect(result.message).toBe('파일을 선택해주세요.');
    });
  });

  describe('createDirectory', () => {
    it('should create directories successfully', async () => {
      const result = await createDirectory('new-folder');
      expect(result.success).toBe(true);
      expect(result.message).toBe('폴더가 생성되었습니다.');
    });

    it('should require authentication', async () => {
      mockValidateRequest.mockResolvedValue({ user: null, session: null });
      const result = await createDirectory('new-folder');
      expect(result.success).toBe(false);
      expect(result.message).toBe('로그인이 필요합니다.');
    });

    it('should validate directory path', async () => {
      const result = await createDirectory('../../../etc');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should reject directories that are too long', async () => {
      const result = await createDirectory('a'.repeat(1001));
      expect(result.success).toBe(false);
      expect(result.message).toBe('디렉토리 경로가 너무 깁니다.');
    });
  });

  describe('createFile', () => {
    beforeEach(() => {
      // Mock HeadObjectCommand to throw NotFound for new files
      const { NotFound } = require('@aws-sdk/client-s3');
      mockS3Send.mockImplementation((command) => {
        if (command.constructor.name === 'HeadObjectCommand') {
          throw new NotFound({ message: 'Not found', $metadata: {} });
        }
        return Promise.resolve({});
      });
    });

    it('should create files successfully', async () => {
      const result = await createFile('test', 'newfile.html');
      expect(result.success).toBe(true);
      expect(result.message).toBe('파일이 생성되었습니다.');
    });

    it('should require authentication', async () => {
      mockValidateRequest.mockResolvedValue({ user: null, session: null });
      const result = await createFile('test', 'newfile.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('로그인이 필요합니다.');
    });

    it('should validate directory path', async () => {
      const result = await createFile('../../../etc', 'passwd');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should validate filename', async () => {
      const result = await createFile('test', '../malicious.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should reject non-editable file extensions', async () => {
      const result = await createFile('test', 'malicious.exe');
      expect(result.success).toBe(false);
      expect(result.message).toContain('지원하지 않는 파일 형식입니다.');
    });

    it('should reject directories that are too long', async () => {
      const result = await createFile('a'.repeat(1001), 'test.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('디렉토리 경로가 너무 깁니다.');
    });

    it('should prevent creating files that already exist', async () => {
      // Mock HeadObjectCommand to succeed (file exists)
      mockS3Send.mockImplementation((command) => {
        if (command.constructor.name === 'HeadObjectCommand') {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      const result = await createFile('test', 'existing.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('이미 존재하는 파일입니다.');
    });
  });

  describe('deleteFile', () => {
    beforeEach(() => {
      // Mock ListObjectsV2Command to return some objects
      mockS3Send.mockImplementation((command) => {
        if (command.constructor.name === 'ListObjectsV2Command') {
          return Promise.resolve({
            Contents: [
              { Key: 'users/testuser/test.html' },
              { Key: 'users/testuser/test.css' }
            ]
          });
        }
        return Promise.resolve({});
      });
    });

    it('should delete files successfully', async () => {
      const result = await deleteFile('test.html');
      expect(result.success).toBe(true);
      expect(result.message).toBe('파일이 삭제되었습니다.');
    });

    it('should require authentication', async () => {
      mockValidateRequest.mockResolvedValue({ user: null, session: null });
      const result = await deleteFile('test.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('로그인이 필요합니다.');
    });

    it('should prevent deleting index.html', async () => {
      const result = await deleteFile('/index.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('홈 페이지는 삭제할 수 없습니다.');
    });

    it('should validate filename', async () => {
      const result = await deleteFile('../../../etc/passwd');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should handle S3 errors gracefully', async () => {
      mockS3Send.mockRejectedValue(new Error('S3 Error'));
      const result = await deleteFile('test.html');
      expect(result.success).toBe(false);
      expect(result.message).toBe('파일 삭제에 실패했습니다.');
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle Unicode normalization attacks', async () => {
      // Try Unicode normalization attack
      const result = await saveFile('test\u002e\u002e/malicious.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
    });

    it('should handle mixed path separators', async () => {
      const result = await saveFile('test\\..\\malicious.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('잘못된 경로입니다.');
    });

    it('should handle very long filenames gracefully', async () => {
      const longName = 'a'.repeat(300) + '.html';
      const result = await saveFile(longName, '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('파일명이 너무 깁니다. (최대 255자)');
    });

    it('should handle filenames with only dots', async () => {
      const result = await saveFile('...html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('허용되지 않는 문자가 포함되어 있습니다.');
    });

    it('should handle case-insensitive reserved names', async () => {
      const result = await saveFile('con.html', '<h1>Test</h1>');
      expect(result.success).toBe(false);
      expect(result.message).toBe('예약된 파일명입니다.');
    });
  });
});