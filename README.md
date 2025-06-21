# 나루 (Naru)

> 당신의 공간이 되는, 나루.

나루는 개인 웹사이트 호스팅 플랫폼으로, 사용자에게 1GB의 저장 공간을 제공하여 자신만의 갠홈페이지를 만들고 관리할 수 있게 해주는 서비스입니다.

## 🚀 주요 기능

- **개인 웹사이트 호스팅**: 사용자별 서브도메인을 통한 개인 웹사이트 제공
- **파일 관리**: 웹 기반 파일 브라우저를 통한 파일 업로드, 편집, 삭제
- **실시간 편집**: CodeMirror 기반의 실시간 코드 편집기
- **다양한 파일 형식 지원**: HTML, CSS, JavaScript, JSON, Markdown 등
- **사용자 인증**: Lucia Auth를 통한 안전한 사용자 인증 시스템
- **통계 대시보드**: 서비스 사용 현황 및 지표 모니터링

## 🏗️ 아키텍처

나루는 두 개의 주요 컴포넌트로 구성됩니다:

### 1. Control Plane (Next.js)
- **위치**: `control-plane/`
- **기술 스택**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **주요 기능**:
  - 사용자 인증 및 계정 관리
  - 웹 기반 파일 브라우저
  - 실시간 코드 편집기
  - 관리자 대시보드

### 2. Proxy Server (Rust)
- **위치**: `proxy/`
- **기술 스택**: Rust, Tokio, Hyper
- **주요 기능**:
  - Cloudflare R2 스토리지 프록시
  - 서브도메인 기반 라우팅
  - 정적 파일 서빙

## 🛠️ 개발 환경 설정

### 사전 요구사항

- **Node.js** 18+ 
- **Rust** 1.70+
- **PostgreSQL** 15+
- **Cloudflare R2** 계정 (또는 AWS S3)

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/naru-pub.git
cd naru-pub
```

### 2. Control Plane 설정

```bash
cd control-plane

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

`.env` 파일을 편집하여 다음 환경 변수들을 설정하세요:

```env
# 데이터베이스
DATABASE_URL=postgresql://username:password@localhost:5432/naru

# 인증
AUTH_SECRET=your-auth-secret-key

# S3/R2 설정
S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=auto

# 기타
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 데이터베이스 설정

```bash
# 데이터베이스 마이그레이션 실행
npm run migrate

# 타입 생성 (선택사항)
npm run kysely-codegen
```

### 4. Proxy Server 설정

```bash
cd ../proxy

# 의존성 설치
cargo build

# 환경 변수 설정
export R2_BUCKET_NAME=your-bucket-name
export R2_ACCOUNT_ID=your-cloudflare-account-id
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export PORT=5000
```

### 5. 개발 서버 실행

**Control Plane:**
```bash
cd control-plane
npm run dev
```

**Proxy Server:**
```bash
cd proxy
cargo run
```

이제 다음 주소에서 서비스에 접근할 수 있습니다:
- Control Plane: http://localhost:3000
- Proxy Server: http://localhost:5000

## 📁 프로젝트 구조

```
naru-pub/
├── control-plane/          # Next.js 웹 애플리케이션
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React 컴포넌트
│   │   ├── lib/          # 유틸리티 및 설정
│   │   └── migrations/   # 데이터베이스 마이그레이션
│   └── package.json
├── proxy/                 # Rust 프록시 서버
│   ├── src/
│   │   └── main.rs       # 메인 서버 로직
│   └── Cargo.toml
└── README.md
```

## 🧪 테스트

```bash
# Control Plane 테스트
cd control-plane
npm run test

# E2E 테스트 (Playwright)
npx playwright test
```

## 📊 사용 가능한 스크립트

### Control Plane

```bash
npm run dev              # 개발 서버 실행
npm run build           # 프로덕션 빌드
npm run start           # 프로덕션 서버 실행
npm run lint            # 코드 린팅
npm run migrate         # 데이터베이스 마이그레이션
npm run kysely-codegen  # 데이터베이스 타입 생성
```

### Proxy

```bash
cargo build             # 빌드
cargo run              # 실행
cargo test             # 테스트
```

## 🤝 기여하기

나루 프로젝트에 기여하고 싶으시다면 다음과 같은 방법들이 있습니다:

### 1. 이슈 리포트
- 버그 발견 시 [GitHub Issues](https://github.com/your-username/naru-pub/issues)에 리포트
- 새로운 기능 제안도 환영합니다

### 2. 코드 기여
1. 이 저장소를 포크합니다
2. 새로운 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

### 3. 개발 가이드라인
- TypeScript/JavaScript 코드는 ESLint 규칙을 따릅니다
- Rust 코드는 `cargo fmt`와 `cargo clippy`를 통과해야 합니다
- 새로운 기능은 테스트 코드를 포함해야 합니다
- 커밋 메시지는 명확하고 설명적이어야 합니다

## 📄 라이선스

이 프로젝트는 [GNU Affero General Public License v3.0](LICENSE) 하에 배포됩니다.

## 📞 문의

- **트위터**: [@naru_pub](https://x.com/naru_pub)
- **이슈**: [GitHub Issues](https://github.com/your-username/naru-pub/issues)

## 🙏 감사의 말

나루는 다음과 같은 오픈소스 프로젝트들에 의존하고 있습니다:

- [Next.js](https://nextjs.org/) - React 프레임워크
- [Lucia Auth](https://lucia-auth.com/) - 인증 라이브러리
- [CodeMirror](https://codemirror.net/) - 코드 에디터
- [Tailwind CSS](https://tailwindcss.com/) - CSS 프레임워크
- [Kysely](https://kysely.dev/) - TypeScript SQL 쿼리 빌더

---

**즐거운 코딩 되세요! 🚀**
