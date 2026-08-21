# RoutePilot — AI配送最適化モック

配送管理者が、自然言語による条件変更、配送計画の再計算、影響確認、人による承認までを体験できる無料公開用モックです。すべて架空データで動作し、外部APIやAPIキーは使用しません。

## 主な機能

- 配送計画のないEMPTY状態から始まる明確な初回導線
- ワンクリックで読み込める架空の配送先10件・車両2台のサンプル計画
- 指定テンプレートによるExcel（.xlsx）／CSV配送計画の取込
- 取込前の行単位検証、プレビュー、人による確定
- SVGによる配送ルート模式図
- Hard constraint（重複割当・容量・稼働時間）の検証
- 配送時間指定をBusiness constraintとして評価
- 「青葉商事を15時以降に変更して」というルールベース指示
- 現在計画と提案計画を分離した比較表示
- 変更の影響説明と、人による承認／却下
- 承認時だけrevision、配送一覧、地図を更新
- スマートフォン向けの乗務前点呼・安全確認デモ
- アルコール、体調、代表的な車両点検、写真証跡の確認
- 点呼結果（運行可・要確認・運行不可）の配送管理画面への連携
- blocked車両を除外した再配車proposalと人による承認
- Desktop 3ペイン、Tablet 2ペイン＋AI切替、Smartphone 1画面1役割のレスポンシブUI
- 配送計画・提案・点呼・写真previewを消去する確認付き完全リセット

> 配車アシスタントはデモ用ルールベース実装です。実LLMや外部AIサービスは使用していません。地図・移動時間もデモ用の推定値です。

> 乗務前点呼はデモ仕様です。法令上の必須事項を示すものではなく、実運用時は対象法令・事業形態・社内規程に合わせた設定が必要です。

## 起動方法

Node.js 20.19以降または22.12以降を用意してください。

```bash
npm install
npm run dev
```

表示されたローカルURLをブラウザで開きます。初回は配送計画のないEMPTY状態です。「サンプルデータで試す」または配送計画importの確定後にRev.1を生成します。

サンプルデータを読み込むと、入力欄へ受入確認用の指示が入ります。

```text
青葉商事を15時以降に変更して
```

### 配送計画を読み込む

画面上部の「配送計画を読み込む」から、次のサンプルをダウンロードして試せます。

- [`public/samples/delivery-plan-template.xlsx`](./public/samples/delivery-plan-template.xlsx)
- [`public/samples/delivery-plan-template.csv`](./public/samples/delivery-plan-template.csv)

選択しただけでは現在計画を変更しません。検証結果とプレビューを確認し、「この配送計画を使用」を押した時点でRev.1の初期計画を生成します。未知の住所を外部サービスへ問い合わせたり、座標を自動生成したりはしません。

テンプレート列は`delivery_id`、`customer_name`、`address`、`time_window_start`、`time_window_end`、`service_minutes`、`package_count`、`priority`、`preferred_vehicle`、`notes`です。

### リセット

「リセット」は確認後、配送計画、revision、変更案、会話、点呼結果、写真previewなど現在の業務セッションをEMPTYへ戻します。サンプルデータは自動で再読込されません。

### ドライバー乗務前点呼

上部の「ドライバー点呼」へ切り替え、ドライバーと車両を選んで開始します。写真はブラウザ内のobject URLで一時表示するだけで、サーバー送信・永続化・リポジトリ保存は行いません。

点呼確定だけでは配送計画を変更しません。運行不可車両に配送がある場合は管理画面へ警告を出し、「再配車案を作成」から既存のproposal・影響比較・人による承認フローを利用します。

## テストとビルド

```bash
npm test
npm run build
npm run preview
```

## 設計上の境界

- `RoutingProvider`: 移動行列と順序付き経路の取得。第1弾は`MockRoutingProvider`
- `AiAssistantProvider`: 自然言語から変更内容への構造化。第1弾は明示的なルールベース実装
- `routeOptimizer`: Hard constraintを守りながら候補計画を計算
- `proposalService`: current/proposedの比較、影響分析、revision検証、承認
- `MockLocationResolver`: テンプレート内の架空配送先だけを固定座標へ解決
- `features/import`: CSV/XLSX解析、行単位validation、Deliveryへの正規化
- `preTripCheckService`: AIを使わない決定論的な運行可否判定
- `DriverCheckView`: 点呼draftと写真preview。completedだけを管理画面へ通知
- SVG表示: Providerから独立したUI責務

Google Maps SDK固有の型はdomainへ持ち込みません。

XLSX読込には、ブラウザで.xlsxを直接解析できる`read-excel-file`を使用しています。CSVは追加依存なしの小さなパーサーで処理します。

## 第1弾に含まないもの

Google Cloud、Cloud Run、Firestore、IAM、Secret Manager、Google Maps Platform実接続、実LLM／AI Agent、本格的な配送最適化、認証、GPS追跡は第2弾以降の対象です。

## セキュリティとデータ

- 顧客名・住所・座標はすべて架空です。
- credential、secret、API keyは不要です。
- `.env`はGit管理対象外です。将来設定が必要になった場合は`.env.example`を雛形として使います。

## ライセンス

[MIT License](./LICENSE)
