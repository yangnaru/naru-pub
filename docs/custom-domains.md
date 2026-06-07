# 커스텀 도메인 (Cloudflare for SaaS + Tunnel)

커스텀 도메인은 Cloudflare Tunnel public hostname만으로는 처리할 수 없습니다. 제3자 도메인은 우리 Cloudflare 계정의 zone이 아니므로, Cloudflare for SaaS의 Custom Hostnames가 TLS와 호스트 수락을 담당해야 합니다. Tunnel은 fallback origin으로 들어온 요청을 프록시까지 전달하고, 프록시는 `Host` 헤더를 보고 Cloudflare에서 활성화된 `custom_domains` 레코드를 사용자 홈 디렉터리로 매핑합니다.

운영 시 필요한 설정:

- Cloudflare for SaaS fallback origin: Tunnel public hostname으로 연결되는 프록시 호스트입니다. 예: `proxy-fallback.naru.pub`
- `CUSTOM_DOMAIN_CNAME_TARGET`: 사용자가 DNS에 설정할 CNAME/ALIAS 대상입니다. Cloudflare for SaaS CNAME target으로 설정해야 합니다. 예: `custom-domains.naru.pub`
- `CLOUDFLARE_USER_API_TOKEN`: Custom Hostnames를 생성/조회/삭제할 API 토큰입니다. Cloudflare의 `SSL and Certificates Write` 권한이 필요합니다.
- `PLATFORM_DOMAIN`: 프록시가 기본 서브도메인 라우팅에 사용할 플랫폼 도메인입니다. 예: `naru.pub`
- `R2_PUBLIC_DOMAIN`: HTML/JS/JSON 외 정적 파일 리다이렉트에 사용할 R2 공개 도메인입니다. 예: `r2.naru.pub`

후원자 전용 기능 활성화는 시간 기반 엔티틀먼트로 제어됩니다([후원과 결제](billing.md) 참고). 사용자가 계정 페이지에서 도메인을 등록하면 control-plane이 Cloudflare Custom Hostname을 생성하고, 사용자는 Cloudflare가 반환한 소유권/인증서 검증 레코드를 DNS에 추가합니다. 프록시는 `cloudflare_status = 'active'`, `ssl_status = 'active'`, `verified_at IS NOT NULL`이고 소유자가 후원자(`supporter_comp` 또는 `supporter_until + PAYMENT_GRACE_DAYS > now()`)인 커스텀 도메인만 서빙합니다.

## ⚠️ Tunnel catch-all 라우트 (필수)

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

## 인증 상태 자동 폴링

도메인 추가 직후에는 DNS 전파와 Cloudflare DCV가 끝나지 않아 `cloudflare_status`/`ssl_status`가 `pending`입니다. cron 컨테이너의 `refresh-custom-domains.ts`가 **3분마다** 아직 활성화되지 않은 커스텀 도메인을 Cloudflare에서 조회해 상태를 갱신하므로, 사용자가 계정 페이지로 돌아와 상태 확인 버튼을 누르지 않아도 검증이 끝나면 자동으로 서빙이 시작됩니다. 계정 페이지의 상태 확인 버튼은 즉시 확인용으로 남아 있습니다.

- 이미 `active`인 도메인은 쿼리에서 제외되어 다시 폴링하지 않습니다.
- 생성된 지 14일이 지난 도메인은 자동 폴링 대상에서 빠지며, 필요하면 수동 버튼으로 갱신할 수 있습니다(방치/오설정 도메인에 대한 무한 폴링 방지).
- Cloudflare 상태 조회는 무료 API 호출이며 과금되지 않습니다. SaaS 비용은 폴링 빈도와 무관하게 활성 custom hostname 개수에만 부과됩니다.

## 만료 후 회수

후원 기간과 결제 유예 기간이 모두 끝나면 cron 컨테이너의 `cleanup-expired-custom-domains.ts`가 Cloudflare for SaaS Custom Hostname을 삭제하고 `custom_domains` 행도 제거합니다. 영구 제공 계정(`supporter_comp`)은 이 회수 대상에서 제외됩니다.
