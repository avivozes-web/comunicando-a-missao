# Como os bots gravam dados

O app lê o Postgres do projeto `lmycoesvfulfrtrehayn`. Quem está logado com o e-mail da equipe lê e escreve pelo RLS. O bot **não** usa esse login: ele usa a **service role** (`SUPABASE_SERVICE_ROLE_KEY`), que ignora o RLS. Essa chave fica só no ambiente do bot. Não entre no frontend, no GitHub Actions nem neste repositório.

URL: `https://lmycoesvfulfrtrehayn.supabase.co`

Cabeçalhos de toda chamada:

```
apikey: <SERVICE_ROLE>
Authorization: Bearer <SERVICE_ROLE>
Content-Type: application/json
Prefer: resolution=merge-duplicates,return=minimal
```

PostgREST: `POST /rest/v1/<tabela>?on_conflict=<colunas>`.

O script `scripts/upsert_metrics.py` já faz isso para snapshot, fichas e relatório semanal.

## O que o bot escreve

Não invente número. Se a coleta falhou, não mande a linha — a tela mostra "—".

### `follower_snapshots`

Uma linha por @ em cada coleta.

| coluna | |
| --- | --- |
| `account` | `escola` (@missaojosue.educacao) ou `missao` (@missaojosue.ofc) |
| `snapshot_date` | `YYYY-MM-DD` |
| `arroba` | sem @ |
| `nome` | nome do perfil, ou vazio |

Conflito: `account,snapshot_date,arroba`.

Para o dia ficar igual ao arquivo, apague o dia e insira de novo (o script faz isso). Não deixe @ antigo no mesmo dia.

### `followers`

Ficha atual de cada @. Uma linha por @, a leitura mais nova.

| coluna | |
| --- | --- |
| `account`, `arroba` | chave |
| `nome` | |
| `seguidores`, `seguindo`, `posts` | inteiros, ou null |
| `privado` | boolean |
| `bio` | texto do perfil, sem reescrever |
| `nicho` | o que a pessoa posta |
| `ficha_em` | data da leitura |

Conflito: `account,arroba`.

### `follower_events`

Quem entrou ou saiu.

| coluna | |
| --- | --- |
| `account` | |
| `event_date` | data do fato |
| `kind` | `entrou` ou `saiu` |
| `arroba` | null se não deu para saber quem |
| `nome` | |
| `note` | observação curta, ou null |

Não há chave natural. Não reinsira o mesmo fato todo dia.

### `goal_days`

Controle diário do Rumo aos Mil. Uma linha por conta e dia.

| coluna | |
| --- | --- |
| `account`, `day` | chave |
| `total` | seguidores no fechamento |
| `entraram`, `sairam`, `saldo` | null se o dia não fechou |
| `fonte` | de onde veio (snapshot, perfil) |
| `status` | `batida`, `não batida`, `fim de semana (sem meta)`, `em andamento` |
| `meta_dia` | meta do dia, null no fim de semana |
| `meta_semana`, `acumulada`, `foco` | da rampa da semana |

Conflito: `account,day`. No upsert, mande só as colunas que você mediu. O script `--set-total` grava apenas `total`.

### `goal_config`

Uma linha por conta. O plano (rampa, checkpoints, funil, ranking) mora aqui. O bot atualiza quando o plano muda, não todo dia.

`notes.traga1` é texto da equipe. Não apague no upsert: leia a linha, misture e grave de volta.

### `link_taps`

Toques no link da bio, do Instagram Insights.

| coluna | |
| --- | --- |
| `account`, `day`, `periodo` | chave. `periodo` distingue "últimos 7 dias" de "últimos 30 dias" |
| `toques` | inteiro |
| `fonte` | texto da origem |

Não grave clique de encurtador (is.gd) nesta tabela.

### `reports`

Um JSON de relatório por período. O formato é o `dados.json` que já existe (chaves `conta`, `seguidores_semana`, `posts`, `stories`, `analise_posts`, `conclusoes`, `aprendizados`, `aplicar`, `estrategia`). A tela lê essas chaves. Campo que não veio vira "—".

| coluna | |
| --- | --- |
| `account` | |
| `kind` | `semanal` ou `mensal` |
| `period_start`, `period_end` | datas |
| `title`, `subtitle` | |
| `pdf_url` | URL do PDF, ou null |
| `payload` | o `dados.json` inteiro |

Conflito: `account,kind,period_start`.

```
python scripts/upsert_metrics.py report \
  --account escola \
  --json relatorios/2026-11-09/dados.json \
  --start 2026-11-03 --end 2026-11-09
```

## O que a equipe edita no app (o bot pode ler, não precisa escrever)

`posts`, `ideas`, `tasks`, `fixed_tasks`, `year_months`, `year_dates`, `narrative`.

Se o bot criar um post, o gatilho `sync_post_tasks` gera quatro tarefas (`gravar` −3 dias, `editar` −2, `aprovar` −1, `postar` no dia), com responsáveis Isabelle, Bezalel, Lídia + Isabelle e Lídia. Título com "a definir", "tema a definir", "nenhum marcado" ou "sem tema" não gera tarefa.

Colunas de `posts` que a tela usa: `account`, `title`, `format` (`reel`, `carrossel`, `stories`, `post_leve`, `video`), `status` (`ideia`, `roteiro`, `gravado`, `editado`, `arte_pronta`, `aprovado`, `postado`), `scheduled_date`, `scheduled_time`, `aspect`, `legenda`, `cover_url`, `drive_url`, `checklist` (lista de `{label, done}`), `note`, `date_tag`, `updated_by`.

Capa: bucket `capas`, caminho livre, leitura pública. `cover_url` guarda a URL pública.

## Rotina

`select rollover_tasks('YYYY-MM-DD')` empurra tarefa avulsa ou gerada que ficou aberta para essa data.

`select materialize_fixed_tasks('YYYY-MM-DD', 'YYYY-MM-DD')` cria a rotina da semana a partir de `fixed_tasks`. O app chama as duas ao abrir.
