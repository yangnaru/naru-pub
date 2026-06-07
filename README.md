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
- **유료 커스텀 도메인**: 인증된 사용자 도메인을 Cloudflare Tunnel 프록시로 라우팅

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
  - 서브도메인 및 커스텀 도메인 기반 라우팅
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
NEXT_PUBLIC_DOMAIN=naru.pub
CUSTOM_DOMAIN_CNAME_TARGET=custom-domains.naru.pub
CLOUDFLARE_ZONE_ID=your-cloudflare-zone-id
CLOUDFLARE_USER_API_TOKEN=your-cloudflare-api-token
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
export PLATFORM_DOMAIN=naru.pub
export R2_PUBLIC_DOMAIN=r2.naru.pub
```

### 커스텀 도메인과 Cloudflare Tunnel

커스텀 도메인은 Cloudflare Tunnel public hostname만으로는 처리할 수 없습니다. 제3자 도메인은 우리 Cloudflare 계정의 zone이 아니므로, Cloudflare for SaaS의 Custom Hostnames가 TLS와 호스트 수락을 담당해야 합니다. Tunnel은 fallback origin으로 들어온 요청을 프록시까지 전달하고, 프록시는 `Host` 헤더를 보고 Cloudflare에서 활성화된 `custom_domains` 레코드를 사용자 홈 디렉터리로 매핑합니다.

운영 시 필요한 설정:

- Cloudflare for SaaS fallback origin: Tunnel public hostname으로 연결되는 프록시 호스트입니다. 예: `proxy-fallback.naru.pub`
- `CUSTOM_DOMAIN_CNAME_TARGET`: 사용자가 DNS에 설정할 CNAME/ALIAS 대상입니다. Cloudflare for SaaS CNAME target으로 설정해야 합니다. 예: `custom-domains.naru.pub`
- `CLOUDFLARE_USER_API_TOKEN`: Custom Hostnames를 생성/조회/삭제할 API 토큰입니다. Cloudflare의 `SSL and Certificates Write` 권한이 필요합니다.
- `PLATFORM_DOMAIN`: 프록시가 기본 서브도메인 라우팅에 사용할 플랫폼 도메인입니다. 예: `naru.pub`
- `R2_PUBLIC_DOMAIN`: HTML/JS/JSON 외 정적 파일 리다이렉트에 사용할 R2 공개 도메인입니다. 예: `r2.naru.pub`

유료 기능 활성화는 `users.custom_domains_enabled = true`로 제어됩니다. 사용자가 계정 페이지에서 도메인을 등록하면 control-plane이 Cloudflare Custom Hostname을 생성하고, 사용자는 Cloudflare가 반환한 소유권/인증서 검증 레코드를 DNS에 추가합니다. 프록시는 `cloudflare_status = 'active'`, `ssl_status = 'active'`, `verified_at IS NOT NULL`인 커스텀 도메인만 서빙합니다.

#### ⚠️ Tunnel catch-all 라우트 (필수)

Cloudflare for SaaS는 커스텀 도메인 요청을 fallback origin으로 보내면서 `Host` 헤더를 원래 커스텀 도메인(예: `limeburst.net`)으로 유지합니다. 이 호스트명은 Tunnel의 어떤 public hostname 규칙과도 일치하지 않으므로, **Tunnel ingress의 마지막 catch-all 규칙이 `http_status:404`가 아니라 프록시(`http://localhost:40001`)를 가리켜야 합니다.** 그렇지 않으면 인증서가 정상 발급되고 프록시 코드가 올바르더라도 모든 커스텀 도메인이 엣지에서 404를 반환합니다.

이 catch-all 규칙은 **Zero Trust 웹 콘솔에서는 설정할 수 없습니다.** Public Hostnames 탭은 자신이 소유한 zone의 `hostname → service` 매핑만 추가할 수 있고, 호스트명 없는 catch-all 항목은 항상 `http_status:404`로 고정되어 편집/삭제가 불가능합니다. 따라서 API로 설정해야 합니다(또는 로컬 `config.yml`의 `ingress` catch-all 사용):

```bash
# 현재 설정 조회 후 마지막 catch-all 항목만 프록시로 변경하여 PUT
# 계정 → Cloudflare Tunnel → Edit 권한이 있는 토큰 필요
curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations \
  -H "Authorization: Bearer $TOKEN"
# config.ingress 배열의 마지막 항목을 {"service": "http://localhost:40001"} 로 바꾼 뒤
# 같은 엔드포인트에 PUT {"config": {...}}
```

여러 앱이 같은 Tunnel을 공유하므로 편집 시 기존 ingress 규칙을 모두 보존해야 합니다. 알 수 없는 호스트는 프록시가 그대로 404를 반환하므로 다른 앱에 영향이 없습니다.

#### 인증 상태 자동 폴링

도메인 추가 직후에는 DNS 전파와 Cloudflare DCV가 끝나지 않아 `cloudflare_status`/`ssl_status`가 `pending`입니다. cron 컨테이너의 `refresh-custom-domains.ts`가 **3분마다** 아직 활성화되지 않은 커스텀 도메인을 Cloudflare에서 조회해 상태를 갱신하므로, 사용자가 계정 페이지로 돌아와 상태 확인 버튼을 누르지 않아도 검증이 끝나면 자동으로 서빙이 시작됩니다. 계정 페이지의 상태 확인 버튼은 즉시 확인용으로 남아 있습니다.

- 이미 `active`인 도메인은 쿼리에서 제외되어 다시 폴링하지 않습니다.
- 생성된 지 14일이 지난 도메인은 자동 폴링 대상에서 빠지며, 필요하면 수동 버튼으로 갱신할 수 있습니다(방치/오설정 도메인에 대한 무한 폴링 방지).
- Cloudflare 상태 조회는 무료 API 호출이며 과금되지 않습니다. SaaS 비용은 폴링 빈도와 무관하게 활성 custom hostname 개수에만 부과됩니다.

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
