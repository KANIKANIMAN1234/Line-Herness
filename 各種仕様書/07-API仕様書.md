# LINE Harness API 仕様書

## 1. 文書の目的

REST API の呼び出し方と情報の所在を説明します。列挙の正本はデプロイ済み Worker の OpenAPI です。

---

## 2. ベース URL とドキュメント

| リソース | 説明 |
|----------|------|
| API ベース | `https://（あなたのWorkerドメイン）` |
| OpenAPI JSON | `GET /openapi.json` |
| Swagger UI | `GET /docs`（利用できない場合は JSON を Swagger Editor に貼る） |

OpenAPI のソースは `apps/worker/src/routes/openapi.ts` にあります。

---

## 3. 認証

ほとんどの API で次のヘッダが必要です。

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

`YOUR_API_KEY` は Worker の環境変数 `API_KEY` と同じ文字列です。

例外（Bearer 不要の例）: LINE Webhook、公開フォーム、一部の受信 Webhook、短縮 URL `/r/*` など。詳細は `apps/worker/src/middleware/auth.ts` を参照してください。

---

## 4. レスポンス形式

成功例:

```json
{ "success": true, "data": { } }
```

失敗例:

```json
{ "success": false, "error": "Unauthorized" }
```

HTTP ステータス: 認証エラー 401、バリデーション 400、未検出 404、サーバエラー 500 など。

---

## 5. 主要エンドポイント早見表

詳細パラメータは `/openapi.json` を参照してください。

### Friends

- `GET /api/friends` … 友だち一覧（limit, offset, tagId, lineAccountId 等）
- `GET /api/friends/count` … 件数（管理画面ログイン検証にも使用）
- `GET /api/friends/{id}` … 詳細とタグ
- `POST /api/friends/{id}/tags` … タグ付与（JSON: tagId）
- `DELETE /api/friends/{id}/tags/{tagId}` … タグ削除

### Tags

- `GET /api/tags` … 一覧
- `POST /api/tags` … 作成（name, color）
- `DELETE /api/tags/{id}` … 削除

### Scenarios

- `GET/POST /api/scenarios` … 一覧・作成
- `GET/PUT/DELETE /api/scenarios/{id}` … 詳細（ステップ含む）・更新・削除
- `POST /api/scenarios/{id}/steps` … ステップ追加
- `PUT/DELETE /api/scenarios/{id}/steps/{stepId}` … ステップ更新・削除
- `POST /api/scenarios/{id}/enroll/{friendId}` … 手動エンロール

### Broadcasts

- `GET/POST /api/broadcasts` … 一覧・作成
- `GET/PUT/DELETE /api/broadcasts/{id}` … 参照・更新・削除
- `POST /api/broadcasts/{id}/send` … 即時送信

### その他

OpenAPI に **Users**（内部 UUID）、**LINE Accounts**、**Conversions**、**Affiliates** などが定義されています。テンプレート、チャット、通知、オートメーション、フォーム等は `openapi.ts` の paths と各 `routes/*.ts` を参照してください。OpenAPI に未掲載のルートは実装が正本です。

---

## 6. 管理画面からの呼び出し

ブラウザ側のラッパは `apps/web/src/lib/api.ts` の `api` オブジェクトです。

---

## 7. TypeScript SDK

`packages/sdk` にクライアントがあり、同じ API をコードから呼び出せます。

---

## 8. 関連文書

- [05-バックエンド仕様書](./05-バックエンド仕様書.md)
- [06-連携仕様書](./06-連携仕様書.md)
