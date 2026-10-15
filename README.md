# t-kosen

高専生向けの、時間割・帰りのバス・構内案内を確認するWebアプリです。学生はログイン不要。React + TypeScript + Vite / Hono / Cloudflare Workers / D1 / Drizzle ORM / pnpmで構成しています。

## できること

- ホームに今日の授業と全方面の次のバス5便を表示。時間割とバスの詳細へ移動
- 上部のメニューボタンからホーム・時間割・バス・構内案内・管理へ移動
- クラス・年度・前期/後期ごとの通常時間割、日付別の変更・休講・補講
- 管理画面での登録・編集、保存ごとの変更履歴（画面は最新100件、DBでは全履歴保持）
- 出発時間・バス停・方面を持つバスデータ、平日/土日祝の自動切替と手動切替
- 全方面から直近5便を表示し、今日の残りが5便未満なら「明日」表示付きで翌日の便を補充
- 方面名で便を検索
- 構内図の階切替、部屋名・番号の候補検索、選択した部屋の強調表示
- クラス・学期とバス方面の検索条件を端末のlocalStorageに保存
- Homeと時間割は設定済みクラスの該当学期を自動選択。未登録・期間外でも別クラスへは切り替えず、時間割画面では過去学期を手動選択可能
- 学生の時間割は表示中に30秒ごと、画面復帰・フォーカス時と更新ボタンでも再取得。非表示中の定期取得は停止
- スマホ向け画面。Teams連携なし

**バスの時刻・停留所、任意投入の時間割サンプルは仮データです。実際の運用前に差し替えてください。** 日本の祝日データは `@holiday-jp/holiday_jp` を利用します。毎年依存更新で翌年の収録を確認してください。

**構内図も仮配置です。実際の校舎の案内には使用せず、学校の図面で検証してから公開してください。** `src/features/campus/shared/floorplan.json` で階・部屋名・検索用別名・配置座標（各階の幅と高さに対する百分率）を管理します。新しい階を追加すると階ボタンと検索結果に反映されます。部屋IDは同じ階で重複させず、`x + w` と `y + h` はそれぞれ100以下にしてください。廊下も現在は仮配置です。

## 開発環境

Node.js 24（最低22.12）とpnpm 11.25.0を利用してください。

```sh
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# .dev.vars のパスワードを16文字以上、署名キーを32文字以上に置換
pnpm db:migrate
pnpm db:seed # 任意：2026年度後期 I1 のサンプル。ローカル専用
pnpm dev
```

Viteは `http://localhost:5173`、APIは `http://localhost:8787`。Viteの `/api` プロキシを使います。`pnpm dev` は初回ビルド後にWranglerとViteを並行起動します。Workers側はAPIコードを監視し、Vite側は画面を即時更新します。学生画面の「管理」からログインできます。

```sh
pnpm check         # 型・Lint・整形・テスト・本番ビルド
pnpm test          # ドメイン、認証、実D1による保存/履歴/競合/レート制限
pnpm format
pnpm build
pnpm exec wrangler dev # ビルド済みの静的画面も含めて確認
```

ローカルD1とsecretは `.wrangler/` と `.dev.vars` にあり、Git対象外です。テストはMiniflareで独立した一時D1を作り、開発DBを変更しません。

## 構成：Core + Feature Modules

```text
src/
  app/                      # 画面の組み立て、Workerエントリ、CSS
    client/features.ts      # 画面・ナビゲーションの登録
    server/features.ts      # APIルートの登録
  core/
    client/                 # 端末設定
    server/                 # 認証、Env、認証用DBスキーマ
  features/
    home/
      client/               # 今日の授業と次の5便の概要
    timetable/
      client/               # 学生画面・管理画面
      server/               # Honoルート、Drizzleスキーマ
      shared/               # 型、Zod検証、日付別時間割の合成
    bus/
      client/               # バス画面
      shared/               # 静的JSON、曜日/祝日/次便の計算
    campus/
      client/               # 階別の仮配置図、候補検索・強調表示
      shared/               # 階・部屋名・座標の静的JSONと検索
  shared/
    client/                 # API通信
    utils/                  # 日本時間の日付処理
migrations/                 # SQL + Drizzleのスナップショット
scripts/seed.sql            # ローカル用サンプル
```

新しい機能は `features/<name>/client`, `server`, `shared` の必要な部分を作り、`app/client/features.ts` と `app/server/features.ts` に登録します。バスのようにAPI不要ならserverは不要です。汎用プラグイン機構やDIコンテナは導入していません。機能固有の処理はその機能に置き、機能の知識を持たない汎用処理だけsharedへ移します。他機能から再利用する業務処理は、元の機能の公開入口から提供します。

依存方向は `pnpm lint`（`pnpm check`とCIにも含む）の `architecture/boundaries` で検査します。ルール本体は `scripts/eslint/architecture.js` にあり、新しい機能名を追加するための設定変更は不要です。

| 参照元   | 許可する参照先                                       |
| -------- | ---------------------------------------------------- |
| app      | core・features・shared。機能の組み合わせと登録を担当 |
| core     | core・shared。appやfeaturesには依存しない            |
| features | core・shared・同じ機能の内部。他機能は公開入口のみ   |
| shared   | shared。app・core・featuresには依存しない            |

clientからserver、serverからclientへの参照は禁止です。shared領域（`features/*/shared`や`shared/utils`など）はclient/serverのどちらにも依存しません。`app/main.tsx`はclient、`app/worker.ts`はserverとして扱います。型だけのimportも同じルールに従い、両側で使う型はsharedに置きます。

他機能が使う型・関数・Hookは、必要なものだけ `features/<name>/<client|server|shared>/index.ts` からexportします。例えばHomeは `../../timetable/client` からHookを参照し、`../../timetable/client/useTimetable` のような内部ファイルへの直接参照はできません。同じ機能の内部では直接参照でき、appは組み立てのため内部参照も可能です。client/server/sharedを混ぜた単一の公開入口は作りません。

検査は通常のimport・再export・動的import・TypeScriptのimport型・requireに適用します。動的に組み立てたモジュールパスは禁止です。現在のローカル参照は相対パスのみを想定しており、パスエイリアスを導入する場合はルールの解決処理とテストも更新してください。この検査は依存方向と公開入口を対象とし、機能間の循環依存の検出は行いません。

複数人で作業する際は機能ごとにブランチを切り、PRでCIを確認してください。ルート登録とDB変更が重なる場合は先に合意してください。

## 時間割のデータ設計

クラスID + 年度 + 学期を一意にした `schedules` に、検証済み時間割のJSONと検索用のメタデータを保存します。通常授業は曜日/時限、変更は日付/時限で管理します。1日1コマの変更が通常授業を上書きし、休講は「休講」表示、補講は週末にも表示できます。学期外は授業を表示しません。

全体を1つのドラフトとして編集・保存する、小規模運用に適した構成です（通常授業40件・変更500件まで）。過去学期も保持します。保存はrevisionによる楽観ロックを使い、別の管理者が先に更新した場合は409を返します。画面から同じ時間割を再選択して読み直し、編集し直してください。クラスID/年度/学期は登録後に変更せず、新しい枠として登録します。

SQLiteのトリガーが保存と同一トランザクションで `history` にスナップショットを追加します。保存失敗時に履歴だけ残ることはありません。共有管理者のため履歴のactorは `admin` です。個別管理者名が必要になれば認証とactorを拡張してください。

将来の画像AI解析は `ScheduleDraft` と既存Zodスキーマに変換し、管理者に確認させた後、同じ保存APIを通します。AIからDBへの直接書き込みは不要です。現時点では画像アップロード・AI呼出しは実装していません。

## 認証とAPI

管理者パスワードはWorkers secretに保存し、比較はSHA-256結果の全バイトで行います。ログイン後は有効期限1時間のHS256署名付きHttpOnly/SameSite=Strict Cookieを利用し、本番HTTPSではSecureを設定します。secret未設定・短すぎる場合は認証を停止します。

更新・ログイン・ログアウトは同一Originを要求します。管理APIは毎回セッションを検証し、公開画面やlocalStorageに管理者tokenを置きません。認証/履歴レスポンスはno-store。ログイン試行はD1でIPのハッシュごとに10分10回までに制限し、古いカウンターを削除します（共有ネットワークでは同じ枠を使います）。パスワード変更だけでは発行済みセッションは失効しないため、緊急時はSESSION_SECRETも変更してください。

| API                             | 認証       | 内容                          |
| ------------------------------- | ---------- | ----------------------------- |
| GET /api/timetables             | 不要       | クラス・年度・学期一覧        |
| GET /api/timetables/:id         | 不要       | 通常時間割と変更              |
| PUT /api/timetables             | 必須       | 新規/更新（revision=0が新規） |
| GET /api/timetables/:id/history | 必須       | 最新100件の履歴               |
| POST /api/auth/login            | パスワード | ログイン                      |
| GET /api/auth/session           | 必須       | 認証確認                      |
| POST /api/auth/logout           | 同一Origin | Cookie削除                    |
| GET /api/health                 | 不要       | ヘルスチェック                |

## Cloudflareにデプロイ

CloudflareアカウントでWorkers Freeを選択し、以下を実行します。このリポジトリは実在するD1 ID・secretを含みません。

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create t-kosen
```

出力された `database_id` を `wrangler.jsonc` のダミーUUIDと置換します。その後：

```sh
pnpm exec wrangler d1 migrations apply t-kosen --remote
pnpm exec wrangler secret put ADMIN_PASSWORD
pnpm exec wrangler secret put SESSION_SECRET
pnpm deploy
```

パスワードは十分長いランダム値を利用し、署名キーは例えば `openssl rand -hex 32` で生成してください。デプロイURLの `/#admin` から実際のクラス・学期・時間割を登録します。静的JSONのバスを編集した場合も再ビルド/再デプロイが必要です。本番にサンプルseedを投入する必要はありません。

通常画面とバスはWorkers Static Assetsから配信し、`/api/*` のみWorkerを起動します。D1への公開読取りは一覧と選択中時間割だけで、公開APIはブラウザキャッシュ30秒を設定しています。学生画面の再取得と管理画面の読取りはキャッシュを使わず、最新データを取得します。学生画面は表示中に30秒ごとに一覧と該当時間割を取得するため、通常は1タブあたり毎分約4リクエストです。非表示中の定期取得は停止し、画面復帰時に再取得します。外部AI・有料サービス・Cronはありません。無料枠内に収まる小規模運用を想定していますが、アクセス量・DB容量・履歴件数に依存します。Cloudflareダッシュボードで使用量を確認してください。

- [Workers料金](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1料金と無料枠](https://developers.cloudflare.com/d1/platform/pricing/)
- [静的アセットの料金](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

## DBスキーマを変更する

Drizzleスキーマを編集し、`pnpm db:generate` で差分SQLを生成します。SQLをレビューして `pnpm db:migrate` でローカルへ適用し、テスト後に本番へ `--remote` で適用してください。最初のmigrationには手書きの監査トリガーも含みます。テーブル再作成が伴う変更ではトリガーの再作成もSQLに含めてください。適用済みmigrationは編集せず新しいmigrationを追加します。データ操作の前にはD1のexport/Time Travelを確認してください。

## 初期版の範囲

個人管理者アカウント、時間割自動取得、画像AI解析、プッシュ通知、オフライン利用は今後の拡張です。授業の開始時刻や学校行事による休日も学校の運用に合わせて追加できます。バスの休日判定は日本の土日祝であり、学校独自の休日は手動切替を利用してください。
