# Cloudflare Workers デプロイ手順書（超初心者向け）

この文書は **LINE Harness の API 部分（`apps/worker`）** を、はじめての人でも **画面のイメージが浮かぶように** Cloudflare Workers へ載せる手順です。  
（管理画面の Vercel デプロイは別です。まず Worker を動かすと API と LINE Webhook が使えます。）

---

## 0. 最終的にこうなる（全体イメージ）

```text
  あなたのPC                    インターネット上
 ┌─────────────┐              ┌──────────────────────────┐
 │ ターミナル    │  deploy     │ Cloudflare                │
 │ でコマンド実行 │ ──────────► │  Workers（API が動く）     │
 └─────────────┘              │  D1（データベース）        │
                              └──────────────────────────┘
                                       ▲
                                       │ HTTPS
                              ┌────────┴────────┐
                              │ LINE / 管理画面  │
                              └─────────────────┘
```

デプロイが成功すると、**`https://（名前）.（あなたのサブドメイン）.workers.dev`** のような URL が付きます。この URL が **API の窓口**です。

---

## 1. 事前に用意するもの

| もの | 理由 |
|------|------|
| **パソコン**（Windows / Mac どちらでも可） | コマンドを打つため |
| **インターネット** | Cloudflare・LINE と通信するため |
| **メールアドレス** | Cloudflare の無料アカウント登録用 |
| **このリポジトリのソースコード** | Git で clone 済み、または ZIP 展開済み |
| **Node.js 20 以上** | [nodejs.org](https://nodejs.org/) からインストール |

Node が入っているか確認（PowerShell または ターミナル）:

```text
node -v
```

例: `v20.10.0` のように **20 以上**なら OK です。

---

## 2. Cloudflare にアカウントを作る（ブラウザ操作）

### 2.1 画面のイメージ

```text
ブラウザのアドレスバー
┌────────────────────────────────────────┐
│ https://dash.cloudflare.com/sign-up   │
└────────────────────────────────────────┘

よくある画面の流れ:
  [メールアドレス入力]
  [パスワード入力]
  [サインアップ] ボタン
        ↓
  メールに届いたコードで認証
        ↓
  無料プランの説明 → 進める
        ↓
  「ドメインを追加しなくても Workers は使える」系の質問は
  とりあえずスキップしてダッシュボードへ
```

### 2.2 やること（箇条書き）

1. ブラウザで **Cloudflare** の公式サイトを開く。
2. **Sign up（サインアップ）** でアカウント作成。
3. メール認証を完了する。
4. **ダッシュボード**（ログイン後のトップ）まで進む。

この時点では **まだ Worker はデプロイしていません**。次から PC のターミナル作業です。

---

## 3. PC でプロジェクトを開く

### 3.1 フォルダのイメージ

リポジトリの **ルート**（`package.json` がある場所）を覚えておきます。

```text
line-harness-oss-main/        ← ここが「ルート」
├── apps/
│   └── worker/               ← Worker の本体（後でここに移動）
├── packages/
├── package.json
└── ...
```

### 3.2 依存パッケージのインストール（初回だけ）

**ルート**で実行します。

```bash
pnpm install
```

`pnpm` が無い場合の例:

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

（または `npm install -g pnpm`）

---

## 4. Wrangler にログインする（PC ⇔ Cloudflare をつなぐ）

**Wrangler** は Cloudflare が公式で用意している CLI（コマンドラインツール）です。  
「この PC から、あなたの Cloudflare アカウントにデプロイしていいですか？」を一度だけ許可します。

### 4.1 コマンドのイメージ

```text
あなたが打つコマンド
┌────────────────────────────────────────┐
│ cd apps/worker                         │
│ npx wrangler login                     │
└────────────────────────────────────────┘
        ↓
ブラウザが自動で開く
┌────────────────────────────────────────┐
│ Cloudflare の「Authorize（許可）」画面   │
│   [Allow] をクリック                   │
└────────────────────────────────────────┘
        ↓
ターミナルに「Successfully logged in」系のメッセージ
```

### 4.2 実際の手順

1. ターミナル（Windows なら **PowerShell**）を開く。
2. Worker フォルダへ移動:

```bash
cd （リポジトリの場所）/apps/worker
```

3. ログイン:

```bash
npx wrangler login
```

4. ブラウザで **Allow** を押す。
5. ターミナルに成功表示が出たら完了。

**うまくいかないとき**: 会社 PC でブラウザがブロックされていると失敗します。別ネットワークや権限のある環境で試してください。

---

## 5. D1 データベースを作る（初回だけ）

D1 は **SQLite 互換のデータベース**です。友だち・シナリオなどのデータをここに保存します。

### 5.1 画面のイメージ（ターミナル出力）

```text
$ npx wrangler d1 create line-crm

✅ Successfully created DB 'line-crm' in region APAC
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← これをコピー！
```

**`database_id` の長い文字列**が重要です。メモ帳に貼り付けておくと安全です。

### 5.2 コマンド

`apps/worker` にいる状態で:

```bash
npx wrangler d1 create line-crm
```

名前 `line-crm` は `wrangler.toml` の `database_name` と **一致させる**のが分かりやすいです（既に `line-crm` と書いてあります）。

---

## 6. wrangler.toml に database_id を書く

### 6.1 ファイルの場所

```text
apps/worker/wrangler.toml
```

### 6.2 編集する行（イメージ）

**変更前:**

```toml
database_id = "YOUR_D1_DATABASE_ID"
```

**変更後（例）:**

```toml
database_id = "あなたがコピーしたUUID"
```

保存します。**引用符**はそのまま残します。

### 6.3 注意

- `YOUR_D1_DATABASE_ID` のままデプロイすると、DB に繋がらずエラーになります。
- `database_name = "line-crm"` は、次の SQL 実行コマンドでも同じ名前を使います。

---

## 7. データベースにテーブルを作る（schema.sql）

### 7.1 何をしているか

`packages/db/schema.sql` に **テーブル定義**が入っています。これを D1 に流し込みます。

### 7.2 コマンドのイメージ

リポジトリ **ルート**に移動してから実行するのが分かりやすいです。

```text
現在のフォルダが「ルート」であることを確認

（ルートで）
npx wrangler d1 execute line-crm --remote --file=packages/db/schema.sql
```

- `--remote` … クラウド上の D1（本番用）に対して実行
- ローカルだけ試すなら `--local`（今回の「デプロイして使う」なら通常は `--remote`）

成功すると、エラーなく終了します。

### 7.3 マイグレーションについて

`packages/db/migrations/` に追加の SQL がある場合は、プロジェクトの README や Wiki の順番に従い **追加で流し込む**ことがあります。まずは `schema.sql` だけでも多くの機能の土台は作れます。

---

## 8. 秘密情報を Cloudflare に登録する（secret）

**API キーや LINE のトークンは `wrangler.toml` に書かないでください。**  
代わりに **暗号化されて Cloudflare 側にだけ保存**される **Secret** として登録します。

### 8.1 画面のイメージ（コマンド実行時）

```text
$ npx wrangler secret put API_KEY

? Enter a secret value: █                    ← ここで貼り付け（表示されない）
✨ Success! Uploaded secret API_KEY
```

同様に **チャネルシークレット**と**チャネルアクセストークン**も登録します。

### 8.2 最低限入れたい Secret（例）

`apps/worker` で、順に実行:

```bash
npx wrangler secret put API_KEY
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
```

| Secret 名 | 中身の例 | どこで決めるか |
|-----------|-----------|----------------|
| `API_KEY` | 長いランダム文字列（32文字以上推奨） | 自分で新規に決める（管理画面ログインにも使う） |
| `LINE_CHANNEL_SECRET` | LINE Developers のチャネルシークレット | LINE Developers コンソール |
| `LINE_CHANNEL_ACCESS_TOKEN` | 長いアクセストークン | LINE Developers コンソール |

**API_KEY** は後で Vercel の管理画面をビルドするときにも同じ値を入力してログインします。

### 8.3 登録済みか確認したいとき

Cloudflare ダッシュボードの **Workers & Pages** → あなたの Worker 名 → **Settings** → **Variables** あたりに Secret の「名前だけ」表示されることがあります（値は見えません）。

---

## 9. デプロイする（いよいよ本番）

### 9.1 コマンド

`apps/worker` にいる状態で:

```bash
npx wrangler deploy
```

または ルートから:

```bash
pnpm --filter worker deploy
```

### 9.2 成功時のイメージ（ターミナル）

```text
Total Upload: xxx KiB / gzip: xxx KiB
Uploaded line-crm-worker
Published line-crm-worker
  https://line-crm-worker.◯◯◯◯.workers.dev    ← この URL をメモ！
Current Version ID: ...
```

**表示された URL** が、あなたの API のベース URL です。

### 9.3 名前を変えたい場合

`wrangler.toml` の先頭:

```toml
name = "line-crm-worker"
```

を変更すると、URL の **`line-crm-worker`** の部分が変わります（初回はそのままで問題ありません）。

---

## 10. 動作確認（ブラウザ）

### 10.1 OpenAPI を開く

ブラウザのアドレスバーに（あなたの URL に置き換え）:

```text
https://line-crm-worker.◯◯◯◯.workers.dev/openapi.json
```

JSON が表示されれば **Worker は生きています**。

### 10.2 認証付き API の例（任意）

友だち件数（ログイン検証と同じ）:

```text
GET https://（WorkerのURL）/api/friends/count
Header: Authorization: Bearer （あなたのAPI_KEY）
```

ブラウザだけではヘッダが付けにくいので、**Thunder Client** や **curl** を使う人向け:

```bash
curl -H "Authorization: Bearer あなたのAPI_KEY" "https://（WorkerのURL）/api/friends/count"
```

`success: true` と `count` が返れば OK です。

---

## 11. LINE とつなぐ（Webhook）

### 11.1 LINE Developers の画面イメージ

```text
LINE Developers
  → あなたのプロバイダー
    → チャネル（Messaging API）
      → Messaging API タブ
        Webhook URL:
        ┌────────────────────────────────────────────┐
        │ https://（WorkerのURL）/webhook            │
        └────────────────────────────────────────────┘
        [Webhookの利用] オン
        [Webhookの再送] お好みで
```

### 11.2 注意

- URL の末尾は **`/webhook`** です（抜けると動きません）。
- `LINE_CHANNEL_SECRET` が Secret と LINE コンソールで **一致**している必要があります。

---

## 12. 管理画面（Vercel）とつなぐ

Vercel の環境変数に:

```text
NEXT_PUBLIC_API_URL = https://（WorkerのURL）
```

（末尾に `/` を付けない運用が多いです。付けた場合はコード側の結合に注意。）

ビルドし直すと、管理画面から同じ Worker を呼び出します。

---

## 13. よくあるつまずき

| 症状 | 確認すること |
|------|----------------|
| `database_id` エラー | `wrangler.toml` の ID が正しいか。`d1 create` の出力と一致しているか。 |
| 401 Unauthorized | `API_KEY` Secret と、リクエストの Bearer が一致しているか。 |
| Webhook 失敗 | URL が `/webhook` か。`LINE_CHANNEL_SECRET` が正しいか。 |
| ビルドエラー | ルートで `pnpm install` 済みか。`apps/worker` で実行しているか。 |
| `wrangler login` できない | ブラウザ連携がブロックされていないか。 |

---

## 14. コマンド一覧（コピペ用・最短ルート）

```bash
# 1) ルートで依存関係
cd （リポジトリルート）
pnpm install

# 2) Worker フォルダへ
cd apps/worker

# 3) Cloudflare ログイン（初回）
npx wrangler login

# 4) D1 作成（初回・名前は wrangler.toml と合わせる）
npx wrangler d1 create line-crm
# → 表示された database_id を wrangler.toml に貼る

# 5) スキーマ投入（ルートに戻って実行してもよい）
cd ../..
npx wrangler d1 execute line-crm --remote --file=packages/db/schema.sql

# 6) Secret（apps/worker で）
cd apps/worker
npx wrangler secret put API_KEY
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN

# 7) デプロイ
npx wrangler deploy
```

---

## 15. 関連文書

- 全体のインストール: [08-インストール解説書](./08-インストール解説書.md)
- API の使い方: [07-API仕様書](./07-API仕様書.md)
- Worker の中身: [05-バックエンド仕様書](./05-バックエンド仕様書.md)
