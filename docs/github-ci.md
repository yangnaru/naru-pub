# GitHub CI Deploys

Naru supports GitHub Actions deploys through GitHub Actions OIDC. Users register
an allowed repository/ref in Naru, then a workflow uploads a generated static
site into a private staging prefix and finalizes the deployment.

GitHub CI deploys are available to supporter accounts.

Recommended official Action repository name: `naru-pub/deploy-action`.
If Naru expects to publish multiple official actions, `naru-pub/actions` with
the deploy action at `naru-pub/actions/deploy@v1` is also a good shape.

## Flow

1. The Action requests a GitHub OIDC token with audience
   `https://naru.pub` or `GITHUB_DEPLOY_AUDIENCE`.
2. `POST /api/deploy/github/plan`
   - verifies the OIDC token,
   - finds a matching enabled deploy target,
   - validates the manifest and quota,
   - creates a planned deployment,
   - returns signed R2 upload URLs for staging keys.
3. The Action uploads every manifest file to the returned staging URLs.
4. `POST /api/deploy/github/finalize`
   - verifies the OIDC token again,
   - checks staged object size and checksum metadata,
   - copies staged objects into the public user prefix,
   - deletes files previously managed by the same target when configured,
   - updates `site_updated_at`, `site_title`, deployment manifest, and home
     directory size,
   - purges Cloudflare cache.

Finalize is the publish step. If it is skipped, uploaded objects remain in the
staging prefix and do not change the public site.

## Workflow Shape

```yaml
name: Deploy to Naru

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install && pnpm build
      - uses: naru-pub/deploy-action@v1
        with:
          site: my-naru-login
          dir: dist
          target: /
```

The target must be registered in Naru before this workflow can deploy.
