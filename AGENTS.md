# Repository Notes

## Kysely Migrations

Create new migrations with `kysely-ctl`, not by hand:

```bash
cd control-plane
pnpm exec kysely migrate:make <migration_name> --extension ts
```

After generation, edit the created file under `control-plane/src/migrations/`.
