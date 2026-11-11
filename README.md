# Comunicando a Missão

Central da mídia da Escola (@missaojosue.educacao) e da Missão (@missaojosue.ofc). Agenda, tarefas, ideias, análises, painel de seguidores e Rumo aos Mil. A interface está em português.

Stack: React, Vite, TypeScript, Tailwind, shadcn/ui, React Router (HashRouter), Recharts e Supabase.

## O que você precisa fazer

1. No SQL editor do Supabase, rode `supabase/migrations/20261111120000_init.sql` e depois `supabase/seed.sql`.
2. Em Authentication, crie um usuário com e-mail e senha e confirme o e-mail na hora (Auto Confirm). Não há tela de cadastro.
3. Desligue o sign-up público do projeto, se ainda estiver ligado.
4. No GitHub, em Settings → Pages, escolha **GitHub Actions** como fonte. O workflow `.github/workflows/pages.yml` publica o `dist` a cada push na `main`. O endereço fica `https://<org>.github.io/comunicando-a-missao/`.

A URL e a chave publicável já estão em `src/lib/utils.ts` e no `.env`. A service role não entra no repositório.

## Desenvolvimento

```bash
npm install
npm run dev
```

`npm run build` gera o site. Com `VITE_PREVIEW=true npm run dev` a tela abre com os dados do mockup e do `src/fixtures/preview.json`, sem o banco. Esse modo não vai para o build de produção.

## Bots

`docs/BOTS.md` explica as tabelas. `scripts/upsert_metrics.py` grava um CSV de seguidores ou um `dados.json` com a service role. `scripts/build_seed.py` recria o `seed.sql` a partir de `data/real`.
