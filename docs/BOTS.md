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

`notes.estrategia` alimenta a aba Rumo aos Mil / Plano. Grave com `notes = notes || jsonb_build_object('estrategia', ...)` para não apagar o resto:

| chave | |
| --- | --- |
| `atualizado_em`, `inicio` | datas `YYYY-MM-DD`. `inicio` filtra marcos e semanas mostrados no Plano |
| `page_url` | link da estratégia completa, ou ausente |
| `diagnostico` | `{ numeros: [{ v, k, d }], texto }` |
| `taticas` | lista de `{ titulo, fazer, quem, esforco, impacto }` |
| `realismo` | texto |
| `regras` | lista de textos |

Os marcos vêm de `checkpoints` e o calendário vem de `rampa`. Não repita esses números em `notes.estrategia`.

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

## O que o bot grava na central

Datas são `YYYY-MM-DD` no calendário de São Paulo. Não mande horário: `2026-11-18T00:00:00Z` não deve ser usado no lugar de `2026-11-18`.

Upsert: `POST /rest/v1/<tabela>?on_conflict=id` com `Prefer: resolution=merge-duplicates,return=minimal`. Mande o `id` (uuid) quando for atualizar a mesma linha. Sem `id`, o banco cria um.

### `ideas`

| coluna | valores |
| --- | --- |
| `id` | uuid. Obrigatório no upsert para não duplicar |
| `account` | `escola` ou `missao` |
| `title` | texto |
| `body` | texto. Pode ser vazio |
| `format` | texto livre. A tela conhece `reel`, `carrossel`, `stories`, `post_leve`, `video` |
| `tags` | lista de textos, por exemplo `{FIMC}` |
| `status` | `ideia`, `aprovada`, `rejeitada` ou `publicada`. `ideia` entra na fila "Esperando você" |
| `suggested_date` | `YYYY-MM-DD` ou null |
| `heart` | true ou false |
| `updated_by` | nome de quem gravou, ou null |

`created_at` e `updated_at` o banco preenche.

### `posts`

| coluna | valores |
| --- | --- |
| `id` | uuid |
| `account` | `escola` ou `missao` |
| `title` | texto. Com "a definir", "tema a definir", "nenhum marcado" ou "sem tema" não gera tarefa |
| `format` | `reel`, `carrossel`, `stories`, `post_leve` ou `video` |
| `status` | `ideia`, `roteiro`, `gravado`, `editado`, `arte_pronta`, `aprovado`, `pronto` ou `postado` |
| `scheduled_date` | `YYYY-MM-DD`. É o dia em que o post aparece na grade |
| `scheduled_time` | `HH:MM` ou null |
| `aspect` | texto ou null, por exemplo `4:5` |
| `legenda` | legenda do Instagram, ou null |
| `legenda_whatsapp` | legenda do WhatsApp, ou null |
| `cover_url` | URL pública de uma capa enviada pela equipe no app, ou null. A Biblioteca não usa esta coluna no cartão |
| `cover_thumb_url` | URL pública da miniatura no bucket `capas`. É a imagem grande do cartão |
| `drive_url` | link do Drive para baixar a arte ou o vídeo, ou null. O arquivo do Drive é privado; clicar na miniatura abre este link |
| `checklist` | lista de `{ "label", "done" }` |
| `ready_checks` | objeto `{ "tamanho", "legenda", "conta", "sem_hashtag", "pix" }` com true/false. A tela marca. O bot não precisa preencher |
| `note`, `date_tag`, `updated_by` | texto ou null |

`arte_pronta` entra na fila "Esperando você". `aprovado`, `pronto` e `postado` entram na Biblioteca. `postado` é "já usei"; os outros dois são "ainda não usei".

Quando `status` passa a `aprovado` e o formato é `reel`, `carrossel` ou `video`, o gatilho `ensure_stories_task` cria a tarefa `Stories: <título>` na conta `escola`, com a nota `puxar para a matrícula 2027`, no mesmo dia do post. Não crie essa tarefa de novo.

O gatilho `sync_post_tasks` cria `gravar` (−3 dias), `editar` (−2), `aprovar` (−1) e `postar` (no dia). Responsáveis: Isabelle, Bezalel, Lídia + Isabelle e Lídia.

### Miniatura da Biblioteca

O arquivo do Drive fica privado. A imagem do cartão é uma miniatura pública.

Bucket: `capas` (já existe, leitura pública).

Caminho padrão: `{id-do-post}/thumb.jpg`  
Exemplo: `c673e394-8e8a-4847-94a8-21483ff666e3/thumb.jpg`

Arquivo: JPG, cerca de 800 px de largura. Carrossel: o 1º slide, proporção 4:5. Reel ou vídeo: a capa, proporção 9:16.

URL pública, que vai em `cover_thumb_url`:

`https://lmycoesvfulfrtrehayn.supabase.co/storage/v1/object/public/capas/{id-do-post}/thumb.jpg`

Subir com a service role (substitui se já existir):

```
PUT /storage/v1/object/capas/{id-do-post}/thumb.jpg
apikey: <SERVICE_ROLE>
Authorization: Bearer <SERVICE_ROLE>
Content-Type: image/jpeg
x-upsert: true
```

O corpo é o arquivo JPG. Em Python, com o mesmo cliente do `scripts/upsert_metrics.py`:

```
POST {url}/storage/v1/object/capas/{id}/thumb.jpg
headers: apikey, Authorization, Content-Type image/jpeg, x-upsert: true
```

Depois grave a coluna (não precisa se a URL seguir o caminho padrão e você já souber o id):

```
PATCH /rest/v1/posts?id=eq.{id}
{ "cover_thumb_url": "https://lmycoesvfulfrtrehayn.supabase.co/storage/v1/object/public/capas/{id}/thumb.jpg" }
```

SQL equivalente, depois do upload:

```sql
update public.posts
set cover_thumb_url = 'https://lmycoesvfulfrtrehayn.supabase.co/storage/v1/object/public/capas/' || id || '/thumb.jpg'
where id = '{id}';
```

Sem `cover_thumb_url`, o cartão mostra o quadro cinza "sem capa ainda".

### `tasks`

Tarefa avulsa do bot usa `kind = adhoc`. Não use `generated`: isso é das quatro tarefas do post.

| coluna | valores |
| --- | --- |
| `id` | uuid |
| `title` | texto |
| `assignee` | texto. Pode ser vazio |
| `account` | `escola`, `missao` ou null (as duas) |
| `due_date` | `YYYY-MM-DD`. Dia em que a tarefa aparece |
| `done` | true ou false. Feita continua na lista, riscada |
| `kind` | `adhoc` para o bot. `fixed` é a rotina. `generated` é do post |
| `origin_date` | na tarefa nova, igual a `due_date` |
| `rolled_from` | null, a menos que a tarefa tenha passado de outro dia |
| `post_id`, `fixed_task_id`, `step` | null na tarefa avulsa. `step` só pode ser `gravar`, `editar`, `aprovar` ou `postar` |
| `badge` | `eventual` ou null |
| `note` | texto curto ou null |
| `sort` | inteiro. Menor número fica primeiro na ordem por prioridade |

### `report_actions`

Ações da aba Análises. Não invente linha se a coleta não trouxe a ação. A tela mostra no máximo 3 da conta, do relatório ou do período.

| coluna | valores |
| --- | --- |
| `id` | uuid |
| `account` | `escola` ou `missao` |
| `report_id` | uuid de `reports`, ou null |
| `body` | o texto da ação |
| `basis` | em que dado do relatório a ação se baseia, ou null |
| `action_date` | `YYYY-MM-DD`. Vira a data da tarefa |
| `sort` | 0, 1, 2 para a ordem |
| `task_id` | null até alguém apertar "Virar tarefa" |

Conflito: `id`.

### `post_comments`

Recados no cartão. A Isabelle grava `ajuste`. O bot grava a resposta com `kind = resposta`.

| coluna | valores |
| --- | --- |
| `id` | uuid |
| `post_id` | uuid do post, ou null se o recado for de uma ideia |
| `idea_id` | uuid da ideia, ou null se o recado for de um post |
| `body` | texto |
| `author` | nome de quem escreveu |
| `kind` | `ajuste`, `resposta` ou `nota` |

Um dos dois, `post_id` ou `idea_id`, tem de vir preenchido. Não apague o histórico: cada resposta é uma linha nova.

## Rotina

`select rollover_tasks('YYYY-MM-DD')` empurra tarefa avulsa ou gerada que ficou aberta para essa data.

`select materialize_fixed_tasks('YYYY-MM-DD', 'YYYY-MM-DD')` cria a rotina da semana a partir de `fixed_tasks`. O app chama as duas ao abrir.

`fixed_tasks`, `year_months`, `year_dates` e `narrative` continuam da equipe. O bot pode ler.
