# タイム記録表スキャナー アプリ仕様書

## 1. 概要

### 1.1 背景
水泳の練習現場では、コーチが手書きのタイム記録表に各選手のタイムを記録している。この手書きデータをデジタル化するには手入力が必要で、時間がかかり入力ミスも発生しやすい。AI Vision を活用し、記録表の画像からタイムを自動で読み取り、整形された画像や CSV/Excel ファイルとして出力するツールを Web アプリ・モバイルアプリの両方で提供する。

### 1.2 目的
- 手書きタイム記録表のデジタル化を自動化
- 整形された画像形式での出力（印刷・共有用）
- CSV / Excel 形式での出力（データ管理・分析用）
- 入力ミスの削減と記録作業の効率化

### 1.3 対象ユーザー
- 水泳チームのコーチ / 管理者
- 選手の保護者
- スイミングスクールのスタッフ

### 1.4 スコープ
- **対象**:
  - Web アプリ（レスポンシブ対応） — `scanner.swim-hub.app`
  - モバイルアプリ（iOS / Android） — Expo (React Native)
- **入力**: 手書きタイム記録表の画像（撮影 or アップロード）
- **出力**:
  - 整形された画像（PNG / JPEG）
  - CSV ファイル
  - Excel ファイル（.xlsx）
- **認証**: Firebase Auth（Google / Apple ログイン）
- **課金**: フリーミアムモデル（無料 + 月額サブスクリプション）
- **対象外**: チーム管理機能、選手間の比較分析、練習メニュー管理

---

## 2. ユーザーストーリー

```
AS A 水泳チームのコーチ
I WANT TO 手書きのタイム記録表を画像から読み取って整形・データ化したい
SO THAT 記録の共有・保管・分析が手軽にできる
```

---

## 3. 技術選定

### 3.1 フロントエンド（Web）
- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** でスタイリング
- **html2canvas** or **@napi-rs/canvas** で整形画像生成
- **SheetJS (xlsx)** で Excel ファイル生成
- **Cloudflare Pages** でホスティング（`@opennextjs/cloudflare`）
- **ドメイン**: `scanner.swim-hub.app`

### 3.2 モバイルアプリ
- **Expo** (React Native) + TypeScript
- **Expo Camera** でカメラ撮影
- **Expo Router** で画面遷移
- **Expo Image Picker** で画像選択
- iOS / Android 両対応

### 3.3 AI Vision API
- **採用**: Google Gemini 2.5 Flash
- **理由**:
  - 無料枠あり（15RPM, 1Mトークン/日）→ 小規模利用ならコスト0円
  - 手書き認識精度が高い
  - Vision LLM のため画像から直接構造化 JSON を返せる
- **コスト**: 入力 $0.15/M トークン、出力 $0.60/M トークン（1回あたり約 $0.001）

### 3.4 バックエンド
- **Next.js API Route** (Route Handler) on Cloudflare Workers
- クライアントから画像(base64)を送信 → API Route で認証検証 + 利用回数チェック → Gemini API 呼び出し → 構造化 JSON を返却
- API キーをクライアントに露出させない
- Firebase Admin SDK でトークン検証

### 3.5 認証
- **Firebase Auth**
- ログイン方法: Google Sign-In / Apple Sign-In
- Web・モバイル両方の SDK あり
- 無料枠: 月間 50,000 MAU まで無料

### 3.6 決済
- **Web**: Stripe Checkout + Stripe Billing（サブスクリプション管理）
- **モバイル**: RevenueCat（Apple IAP / Google Play Billing を統合管理）
- RevenueCat の Webhook → API で Firebase ユーザーの課金状態を同期
- RevenueCat 無料枠: 月間収益 $2,500 まで無料

### 3.7 広告
- **モバイル**: Google AdMob（リワード広告）
- **Web**: Google AdSense（リワード広告）
- 解析中（ローディング中）にリワード広告を表示
- 有料ユーザーには広告非表示

### 3.8 データストア
- **Firestore** (Firebase)
- 保存データ:
  - ユーザーごとの日次利用回数
  - サブスクリプション状態（free / premium）
  - サブスクリプション有効期限
- 画像データ・解析結果はサーバーに保持しない（プライバシー配慮）

### 3.9 モノレポ構成
- **Turborepo** + **pnpm workspaces**
- 構成:
```
swimhub-scanner/
├── apps/
│   ├── web/              # Next.js (Cloudflare Pages)
│   └── mobile/           # Expo (React Native)
├── packages/
│   ├── shared/           # 共通型定義、バリデーション、ビジネスロジック
│   └── config/           # 共通設定 (ESLint, TypeScript, Prettier)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```
- **packages/shared** で共有するもの:
  - API リクエスト / レスポンスの型定義
  - タイム変換ロジック（3桁数字 → 秒.コンマ秒）
  - バリデーションルール
  - 課金プラン定義（制限値など）

### 3.10 不採用とした選択肢
| 選択肢 | 不採用理由 |
|---|---|
| Google Cloud Vision (OCR) | テキスト抽出のみで表の構造を理解できない |
| クライアント直接呼び出し | API キーがブラウザに露出するセキュリティリスク |
| Claude Vision | 精度は高いがコストが Gemini の約6倍。無料枠なし |
| Vercel | Cloudflare で swim-hub.app ドメインを管理しており、Pages/Workers に統一する方が運用シンプル |
| Supabase Auth | モバイル SDK が Firebase より薄い。Firestore との統合が不要になるメリットもない |
| Stripe のみ (IAP なし) | モバイルアプリで外部決済を使うと Apple 審査でリジェクトリスクあり |

---

## 4. データフロー

### 4.1 スキャンフロー

```
┌──────────────────┐     ┌──────────────────────────┐     ┌─────────────┐
│  Web / Mobile    │     │  API Route               │     │ Gemini API  │
│                  │     │  (Cloudflare Workers)     │     │             │
│ 0. ログイン       │     │                          │     │             │
│    (Firebase)    │     │                          │     │             │
│                  │     │                          │     │             │
│ 1. 画像アップ     │────▶│ 2. トークン検証           │     │             │
│    ロード         │     │    (Firebase Admin)      │     │             │
│                  │     │                          │     │             │
│                  │     │ 3. 利用回数チェック        │     │             │
│                  │     │    (Firestore)           │     │             │
│                  │     │                          │     │             │
│                  │     │ 4. 画像送信 ──────────────│────▶│ 5. AI解析    │
│                  │     │                          │     │             │
│                  │◀────│ 6. JSON返却              │◀────│  構造化JSON  │
│                  │     │    + 利用回数インクリメント  │     │             │
│                  │     │                          │     │             │
│ 7. リワード広告   │     │                          │     │             │
│    (無料ユーザー)  │     │                          │     │             │
│                  │     │                          │     │             │
│ 8. 結果を確認     │     │                          │     │             │
│    ・修正         │     │                          │     │             │
│                  │     │                          │     │             │
│ 9. 出力          │     │                          │     │             │
│  ├─ 整形画像      │     │                          │     │             │
│  ├─ CSV          │     │                          │     │             │
│  └─ Excel        │     │                          │     │             │
└──────────────────┘     └──────────────────────────┘     └─────────────┘
```

### 4.2 課金フロー

```
┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Web             │     │  Stripe          │     │ API Route       │
│  課金ボタン押下    │────▶│  Checkout Session │────▶│ Webhook 受信     │
│                  │◀────│  決済完了         │     │ Firestore 更新   │
│  Premium 有効     │     │                  │     │ (premium化)      │
└──────────────────┘     └──────────────────┘     └─────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Mobile          │     │  RevenueCat      │     │ API Route       │
│  課金ボタン押下    │────▶│  IAP 処理        │────▶│ Webhook 受信     │
│                  │◀────│  購入完了         │     │ Firestore 更新   │
│  Premium 有効     │     │                  │     │ (premium化)      │
└──────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 5. 認証設計

### 5.1 ログインフロー
1. ユーザーがアプリを開く
2. 未ログインの場合 → ログイン画面を表示
3. Google Sign-In または Apple Sign-In でログイン
4. Firebase Auth がトークンを発行
5. 以降の API 呼び出しに `Authorization: Bearer <idToken>` を付与

### 5.2 トークン検証（API Route）
- リクエストヘッダーから Bearer トークンを取得
- Firebase Admin SDK の `verifyIdToken()` で検証
- 検証失敗 → 401 Unauthorized を返却
- 検証成功 → `uid` を取得し、Firestore で利用状態を参照

### 5.3 Apple Sign-In 対応
- iOS アプリでは Apple Sign-In が必須（App Store ガイドライン）
- Web でも Apple Sign-In を提供（Firebase Auth が対応済み）

---

## 6. 課金・利用制限設計

### 6.1 プラン比較

| | 無料プラン | Premium（¥1,000/月） |
|---|---|---|
| 1日の利用回数 | **1回**（0:00 JST リセット） | **無制限** |
| 1回の最大選手数 | **8名** | **無制限**（10名程度まで精度保証） |
| リワード広告 | **解析中に表示** | **非表示** |
| 出力機能 | 全て利用可 | 全て利用可 |

### 6.2 利用回数管理

**Firestore データモデル**:
```typescript
// コレクション: users/{uid}
{
  plan: "free" | "premium",
  premiumExpiresAt: Timestamp | null,
  // サブコレクション: users/{uid}/usage/{YYYY-MM-DD}
}

// コレクション: users/{uid}/usage/{YYYY-MM-DD}
{
  scanCount: number,       // その日のスキャン回数
  lastScanAt: Timestamp    // 最後のスキャン時刻
}
```

**リセットロジック**:
- 日付キー (`YYYY-MM-DD`) を JST 基準で生成
- 当日のドキュメントが存在しなければ `scanCount: 0` で新規作成
- `scanCount` が制限に達していたら 429 を返却

### 6.3 リワード広告フロー

```
1. ユーザーが「解析する」を押下
2. 無料ユーザーの場合 → リワード広告を表示
   ├─ 広告視聴完了 → 解析リクエストを送信
   └─ 広告スキップ/エラー → 解析リクエストを送信（広告は任意）
3. 有料ユーザーの場合 → 広告なしで即座に解析リクエスト送信
4. 解析中のローディング画面を表示
```

> **注**: リワード広告は「視聴しないと使えない」ではなく、解析開始時に表示する形式。
> 広告の読み込み失敗時はスキップして解析を実行する（広告で UX を阻害しない）。

### 6.4 サブスクリプション管理

**Web (Stripe)**:
- Stripe Checkout Session を作成 → ユーザーが決済ページで支払い
- Webhook イベント:
  - `checkout.session.completed` → Firestore を `premium` に更新
  - `customer.subscription.deleted` → Firestore を `free` に更新
  - `invoice.payment_failed` → 猶予期間後に `free` に更新
- 月額: ¥1,000（税込）

**Mobile (RevenueCat)**:
- RevenueCat SDK で Apple IAP / Google Play Billing を統合
- RevenueCat Webhook → API Route で受信
  - `INITIAL_PURCHASE` → Firestore を `premium` に更新
  - `EXPIRATION` → Firestore を `free` に更新
  - `RENEWAL` → `premiumExpiresAt` を更新
- 月額: ¥1,000（Apple/Google の手数料 15-30% は売上から差し引かれる）

### 6.5 クロスプラットフォーム課金の同期
- Web で課金 → Stripe Webhook → Firestore 更新 → モバイルでも Premium 反映
- モバイルで課金 → RevenueCat Webhook → Firestore 更新 → Web でも Premium 反映
- 課金状態は Firestore を Single Source of Truth とする
- アプリ起動時に Firestore からプラン状態を取得

---

## 7. API 設計

### 7.1 スキャン API: `POST /api/scan-timesheet`

**Headers**:
```
Authorization: Bearer <Firebase ID Token>
```

**Request**:
```typescript
{
  "image": string,       // base64エンコードされた画像データ
  "mimeType": "image/jpeg" | "image/png"
}
```

**Response (200)**:
```typescript
{
  "menu": {
    "distance": 50,                 // 1本の距離(m)
    "repCount": 6,                  // 1セットあたりの本数
    "setCount": 3,                  // セット数
    "circle": 90,                   // サークルタイム(秒)、読み取れなければ null
    "description": "3s x 6 x 50m 1'30 ゴールセット" // セット説明（参考情報）
  },
  "swimmers": [
    {
      "no": 1,
      "name": "田中太郎",            // 読み取れない場合は空文字
      "style": "Br",                // 種目 (Fr/Br/Ba/Fly/IM)
      "times": [                    // 全本のタイム(秒)、読み取れない場合は null
        36.4, 36.9, 37.4, 37.8, 37.5, 37.2,
        37.4, 38.0, 37.5, 37.0, 37.4, 38.0,
        37.5, 36.8, 37.5, 37.6, 37.8, 37.5
      ]
    }
    // ... 他の選手
  ]
}
```

**Error Responses**:
```typescript
// 401 Unauthorized
{ "error": "認証が必要です", "code": "UNAUTHORIZED" }

// 429 Too Many Requests
{ "error": "本日の利用回数上限に達しました", "code": "DAILY_LIMIT_EXCEEDED" }

// 400 Bad Request（無料ユーザーで選手数超過）
{ "error": "無料プランでは8名まで解析可能です", "code": "SWIMMER_LIMIT_EXCEEDED" }

// 400 Bad Request
{ "error": "エラーメッセージ", "code": "PARSE_ERROR" | "IMAGE_ERROR" }

// 500 Internal Server Error
{ "error": "サーバーエラーが発生しました", "code": "API_ERROR" }
```

### 7.2 ユーザー状態 API: `GET /api/user/status`

**Headers**:
```
Authorization: Bearer <Firebase ID Token>
```

**Response (200)**:
```typescript
{
  "plan": "free" | "premium",
  "premiumExpiresAt": string | null,  // ISO 8601
  "todayScanCount": number,
  "dailyLimit": number | null,        // null = 無制限
  "maxSwimmers": number | null        // null = 無制限
}
```

### 7.3 Stripe Checkout API: `POST /api/checkout/stripe`

**Headers**:
```
Authorization: Bearer <Firebase ID Token>
```

**Response (200)**:
```typescript
{
  "checkoutUrl": string  // Stripe Checkout Session の URL
}
```

### 7.4 Webhook エンドポイント

- `POST /api/webhook/stripe` — Stripe イベント受信（署名検証あり）
- `POST /api/webhook/revenuecat` — RevenueCat イベント受信（認証トークン検証あり）

### 7.5 Gemini プロンプト設計

```
あなたは水泳のタイム記録表を読み取るアシスタントです。
手書きの記録表の画像から、以下の情報をJSON形式で抽出してください。

## ルール
- 3桁の数字（例: 364）は秒+コンマ秒に変換する（364 → 36.4）
- 種目の略称: Fr=自由形, Br=平泳ぎ, Ba=背泳ぎ, Fly=バタフライ, IM=個人メドレー
- 欄外のメタ情報（日付、場所、担当、セット説明）も識別する
- 読み取れない数字がある場合は null とする
- 名前が読み取れない場合は空文字とする
- セット平均やまとめの行は無視する（個別タイムのみ抽出）

## 出力形式
以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。
{menu: {...}, swimmers: [...]}
```

---

## 8. 画面設計

### 8.1 ページ構成

| ページ | パス | 説明 |
|---|---|---|
| ログイン | `/login` | Google / Apple Sign-In |
| トップ / スキャン | `/` | メイン画面。画像アップロード → 解析 → 確認 → 出力 |
| サブスクリプション | `/subscription` | プラン確認・課金・解約 |

### 8.2 UX フロー

```
┌─────────────────────────────────────────────────────┐
│  タイム記録表スキャナー            [👤 アカウント]     │
│                                                     │
│  残り利用回数: 1/1 (0:00にリセット)                   │
│                                                     │
│  ┌───────── Step 1: 画像アップロード ─────────┐       │
│  │                                           │       │
│  │   📷 画像をドラッグ&ドロップ                │       │
│  │      または クリックして選択                 │       │
│  │                                           │       │
│  │         [解析する]                         │       │
│  └───────────────────────────────────────────┘       │
│                     ↓                                │
│  ┌───────── Step 2: 解析中 + 広告 ─────────┐         │
│  │   ⏳ 画像を解析しています...              │         │
│  │                                         │         │
│  │   ┌─────────────────────────────┐       │         │
│  │   │     リワード広告表示エリア     │       │         │
│  │   │     (無料ユーザーのみ)        │       │         │
│  │   └─────────────────────────────┘       │         │
│  └─────────────────────────────────────────┘         │
│                     ↓                                │
│  ┌───────── Step 3: 結果確認・修正 ──────────┐       │
│  │   メニュー: 3s x 6 x 50m 1'30            │       │
│  │                                           │       │
│  │   ┌──┬───────┬────┬──────┬──────┬─────┐  │       │
│  │   │No│ 名前  │種目│ 1本目│ 2本目│ ... │  │       │
│  │   ├──┼───────┼────┼──────┼──────┼─────┤  │       │
│  │   │ 1│田中   │ Br │ 36.4 │ 36.9 │ ... │  │       │
│  │   │ 2│鈴木   │ Fr │ 35.0 │ 35.6 │ ... │  │       │
│  │   └──┴───────┴────┴──────┴──────┴─────┘  │       │
│  │                                           │       │
│  │   [画像で出力] [CSVで出力] [Excelで出力]    │       │
│  └───────────────────────────────────────────┘       │
│                                                     │
│  ┌───────────────────────────────────────────┐       │
│  │  💎 Premiumにアップグレード                 │       │
│  │  広告なし・回数無制限・選手数無制限           │       │
│  │  月額 ¥1,000                              │       │
│  │                [アップグレード]              │       │
│  └───────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

### 8.3 ログイン画面
- アプリロゴ + サービス名
- 「Google でログイン」ボタン
- 「Apple でログイン」ボタン
- サービス説明（簡潔に）

### 8.4 Step 1: 画像アップロード
- ドラッグ&ドロップ or クリックでファイル選択
- スマホの場合はカメラ撮影も選択可能（`accept="image/*" capture="environment"`）
- モバイルアプリの場合は Expo Camera でネイティブカメラ起動
- 画像プレビュー表示
- ファイル形式チェック（JPEG, PNG）、サイズチェック（10MB以下）
- 残り利用回数の表示（無料ユーザー）
- 利用回数上限の場合 → 「本日の利用回数に達しました」+ Premium 誘導
- 「解析する」ボタン

### 8.5 Step 2: 解析中 + リワード広告
- ローディングスピナー + 「画像を解析しています...」メッセージ
- 無料ユーザー: リワード広告を表示（広告読み込み失敗時はスキップ）
- 有料ユーザー: 広告なし
- キャンセルボタン

### 8.6 Step 3: 結果確認・修正
- **メニュー情報表示**: 距離、サークル、セット数、本数、セット説明
- **選手×タイム テーブル**:
  - 名前・種目は編集可能
  - 各タイムセルをクリックして直接編集可能
  - null（読み取れなかった）セル → 黄色ハイライト
  - 最速タイム → 赤文字、最遅タイム → 青文字
  - 修正後、平均・最速・最遅を自動再計算
- **行の追加・削除**: 選手行の追加/削除が可能
- **出力ボタン群**（3種類）

### 8.7 サブスクリプション画面
- 現在のプラン表示（Free / Premium）
- Premium の特典一覧
- 月額 ¥1,000 で購入ボタン
  - Web: Stripe Checkout に遷移
  - モバイル: ネイティブ IAP ダイアログ
- 有料ユーザー: 次回更新日、解約ボタン

---

## 9. 出力形式

### 9.1 整形画像出力（PNG / JPEG）

見やすく整形されたタイム記録表を画像として生成・ダウンロード。

**レイアウト**:
```
┌─────────────────────────────────────────────────┐
│            タイム記録表                           │
│  日付: 2026/02/23    メニュー: 3s x 6 x 50m     │
│  サークル: 1'30                                  │
├──┬────────┬────┬──────┬──────┬──────┬─────┬─────┤
│No│  名前  │種目│ 1本目│ 2本目│ 3本目│ ... │ 平均 │
├──┼────────┼────┼──────┼──────┼──────┼─────┼─────┤
│ 1│田中太郎│ Br │ 36.4 │ 36.9 │ 37.4 │ ... │37.1 │
│ 2│鈴木花子│ Fr │ 35.0 │ 35.6 │ 36.7 │ ... │35.8 │
├──┴────────┴────┴──────┴──────┴──────┴─────┴─────┤
│  Generated by タイム記録表スキャナー               │
└─────────────────────────────────────────────────┘
```

- 最速タイム → 赤文字太字、最遅タイム → 青文字
- 背景は白、テーブルは罫線付きで印刷に適したデザイン
- 高解像度（2x）で生成し、印刷用途にも対応

### 9.2 CSV 出力

```csv
No,名前,種目,1本目,2本目,3本目,...,平均,最速,最遅
1,田中太郎,Br,36.4,36.9,37.4,...,37.1,36.4,38.0
2,鈴木花子,Fr,35.0,35.6,36.7,...,35.8,35.0,36.7
```

- ヘッダー行あり
- UTF-8（BOM付き）で出力（Excel で文字化けしない）
- ファイル名: `タイム記録_YYYYMMDD.csv`

### 9.3 Excel 出力（.xlsx）

- ヘッダー行: 太字、背景色付き
- 最速タイム: 赤文字太字
- 最遅タイム: 青文字
- 平均・最速・最遅は自動計算列
- メニュー情報をシート上部に記載
- 列幅自動調整
- ファイル名: `タイム記録_YYYYMMDD.xlsx`

---

## 10. エラーハンドリング

| エラーケース | 対応 |
|---|---|
| 未ログイン | ログイン画面にリダイレクト |
| 認証トークン期限切れ | 自動リフレッシュ → 失敗なら再ログイン |
| 日次利用回数超過 | 「本日の利用回数に達しました」+ Premium 誘導 |
| 選手数超過（無料ユーザー） | 「無料プランでは8名まで解析可能です」+ Premium 誘導 |
| 画像が不鮮明 | 「読み取れませんでした。鮮明な画像で再試行してください」 |
| 一部のタイムが読み取れない | null として返却 → 確認画面で黄色ハイライト → 手動入力 |
| Gemini API エラー | リトライ1回 → 失敗なら「サーバーエラーが発生しました」表示 |
| ネットワークエラー | 「ネットワークエラーです。接続を確認してください」 |
| 画像サイズ超過（10MB以上） | アップロード前にバリデーション、エラー表示 |
| 非対応の画像形式 | 「JPEG または PNG 形式の画像をアップロードしてください」 |
| 決済エラー (Stripe) | 「決済に失敗しました。別の支払い方法をお試しください」 |
| 決済エラー (IAP) | 「購入に失敗しました。App Store / Google Play の設定を確認してください」 |
| 広告読み込み失敗 | 広告をスキップして解析を続行（UX を阻害しない） |

---

## 11. 制約・制限事項

### 11.1 アプリ制約
- **対応画像**: JPEG, PNG
- **最大画像サイズ**: 10MB
- **最大選手数**: 無料 8名 / Premium 10名程度（それ以上は精度低下の可能性）
- **対応フォーマット**: 表形式（横に本数、縦に選手）
- **画像データ保持**: サーバーに保存しない（解析後即破棄）

### 11.2 外部サービス制限
- **Gemini 無料枠**: 15RPM, 1M トークン/日
- **Firebase Auth 無料枠**: 50,000 MAU/月
- **Firestore 無料枠**: 読み取り 50,000回/日、書き込み 20,000回/日
- **RevenueCat 無料枠**: 月間収益 $2,500 まで
- **Cloudflare Workers 無料枠**: 100,000 リクエスト/日

### 11.3 課金に関する注意
- Apple IAP 手数料: 15%（Small Business Program 適用時）〜 30%
- Google Play 手数料: 15%（年間 $1M まで）〜 30%
- Web (Stripe) 手数料: 3.6%
- クロスプラットフォーム課金の二重課金防止が必要

---

## 12. 将来の拡張

| 機能 | 説明 | 優先度 |
|---|---|---|
| 複数画像対応 | 2ページにまたがる記録表を連結して解析 | 高 |
| テンプレート機能 | よく使うメニュー構成を保存・再利用 | 中 |
| PDF 出力 | 印刷用 PDF ファイルの出力 | 中 |
| 履歴機能 | Firestore にスキャン履歴を保存（Premium のみ） | 中 |
| チーム課金プラン | チーム単位でのサブスク（複数コーチで共有） | 中 |
| PWA 対応 | Web版をホーム画面追加可能に、モバイルアプリへの誘導 | 低 |
| モデル切り替え | Gemini Pro / Claude への動的切り替え | 低 |
| バッチ処理 | 複数画像を一括アップロード・一括出力 | 低 |
| プッシュ通知 | モバイルアプリでの練習リマインダー等 | 低 |

---

## 13. 実装 TODO

### Phase 1: モノレポセットアップ + 基盤

- [ ] **1.1** モノレポ初期化
  - Turborepo + pnpm workspaces でプロジェクト作成
  - `apps/web` — Next.js (App Router, TypeScript, Tailwind CSS)
  - `apps/mobile` — Expo (TypeScript)
  - `packages/shared` — 共通型定義・ロジック
  - `packages/config` — ESLint, TypeScript, Prettier 共通設定

- [ ] **1.2** Cloudflare セットアップ
  - Cloudflare Pages プロジェクト作成
  - `@opennextjs/cloudflare` 設定
  - `scanner.swim-hub.app` サブドメイン設定 (DNS)
  - Wrangler CLI 設定

- [ ] **1.3** Firebase セットアップ
  - Firebase プロジェクト作成
  - Firebase Auth 有効化（Google / Apple プロバイダー）
  - Firestore データベース作成
  - セキュリティルール設定

---

### Phase 2: 認証

- [ ] **2.1** Web 認証
  - Firebase Auth SDK 導入 (Web)
  - Google Sign-In / Apple Sign-In 実装
  - ログイン画面 UI
  - 認証状態管理（Context / Zustand）
  - 認証ガード（未ログイン → リダイレクト）

- [ ] **2.2** モバイル認証
  - Firebase Auth SDK 導入 (Expo)
  - Google Sign-In / Apple Sign-In 実装（Expo AuthSession）
  - ログイン画面 UI

- [ ] **2.3** API 認証ミドルウェア
  - Firebase Admin SDK 導入
  - Bearer トークン検証ミドルウェア
  - Firestore ユーザードキュメント自動作成

---

### Phase 3: コア機能（AI 解析）

- [ ] **3.1** API Route 作成（`/api/scan-timesheet`）
  - Gemini 2.5 Flash API キーを環境変数に設定
  - base64 画像受信 → Gemini Vision API 呼び出し → JSON 返却
  - 認証チェック + 利用回数チェック
  - エラーハンドリング（リトライ、バリデーション）

- [ ] **3.2** 利用回数管理
  - Firestore の日次利用回数カウント
  - 無料ユーザーの回数制限チェック
  - 選手数制限チェック（無料 8名 / Premium 無制限）

- [ ] **3.3** プロンプト設計・チューニング
  - 構造化 JSON 出力用プロンプトを作成
  - 手書きタイム表のサンプル画像（3〜5枚）でテスト
  - 3桁数字 → 秒.コンマ秒変換の精度検証
  - エッジケース対応（読み取れない文字、斜め撮影など）

---

### Phase 4: Web 版 UI 完成

- [ ] **4.1** 画像アップロード UI
  - ドラッグ&ドロップ / ファイル選択 / カメラ撮影
  - 画像プレビュー
  - ファイルバリデーション（形式、サイズ）
  - 利用回数表示 + 制限時の Premium 誘導

- [ ] **4.2** API 呼び出し + ローディング + リワード広告 (AdSense)
  - base64 エンコード → API Route に POST
  - ローディング UI（スピナー + メッセージ）
  - 無料ユーザー: リワード広告表示
  - エラー表示

- [ ] **4.3** 結果確認テーブル
  - メニュー情報表示
  - 選手×タイムの編集可能テーブル
  - 最速 → 赤文字、最遅 → 青文字、null → 黄色ハイライト
  - 名前・種目・タイムの直接編集
  - 行の追加・削除

- [ ] **4.4** 出力機能
  - 整形画像出力（html2canvas, 高解像度 2x, PNG ダウンロード）
  - CSV 出力（UTF-8 BOM 付き）
  - Excel 出力（SheetJS, スタイル付き）

---

### Phase 5: モバイルアプリ

- [ ] **5.1** Expo プロジェクトセットアップ
  - Expo Router 設定
  - shared パッケージの参照設定
  - 基本画面構成（ログイン / スキャン / サブスクリプション）

- [ ] **5.2** カメラ撮影 + 解析フロー
  - Expo Camera でカメラ起動
  - Expo Image Picker で画像選択
  - API 呼び出し + ローディング

- [ ] **5.3** 結果確認・修正 UI
  - 編集可能テーブル（モバイル最適化）
  - 出力機能（Share Sheet 経由）

- [ ] **5.4** リワード広告 (AdMob)
  - Expo AdMob (react-native-google-mobile-ads) 導入
  - 解析時のリワード広告表示

---

### Phase 6: 課金

- [ ] **6.1** Stripe サブスクリプション (Web)
  - Stripe アカウント設定 + 商品作成 (¥1,000/月)
  - Checkout Session 作成 API
  - Webhook 処理（subscription 作成/更新/削除）
  - サブスクリプション管理画面

- [ ] **6.2** RevenueCat IAP (モバイル)
  - RevenueCat プロジェクト設定
  - Apple App Store Connect / Google Play Console で IAP 商品作成
  - RevenueCat SDK 導入 (Expo)
  - 購入フロー実装
  - Webhook 処理（Firestore 同期）

- [ ] **6.3** 課金状態の同期
  - Firestore の課金状態を Web / モバイル両方で参照
  - クロスプラットフォーム二重課金防止

---

### Phase 7: 仕上げ・デプロイ

- [ ] **7.1** Web デプロイ
  - Cloudflare Pages へのデプロイ
  - `scanner.swim-hub.app` ドメイン設定
  - 環境変数設定（GEMINI_API_KEY, Firebase, Stripe）
  - OGP / メタ情報 / favicon

- [ ] **7.2** モバイルデプロイ
  - EAS Build 設定
  - Apple Developer アカウント + App Store Connect 設定
  - Google Play Console 設定
  - テスト配信（TestFlight / 内部テスト）
  - ストア申請（審査対応）

- [ ] **7.3** 最終テスト
  - Web / モバイル両方での E2E テスト
  - 課金フローの検証（テスト環境）
  - 本番環境での動作確認

---

### 実装順序の目安

```
Phase 1 (モノレポ + 基盤)     ████░░░░░░  2-3日
Phase 2 (認証)               ████░░░░░░  2-3日
Phase 3 (AI解析)             ████████░░  3-4日
Phase 4 (Web UI)             ██████░░░░  3-4日
Phase 5 (モバイル)            ████████░░  4-5日
Phase 6 (課金)               ██████░░░░  3-4日
Phase 7 (仕上げ)             ████░░░░░░  2-3日
```

**合計: 約 19〜26日**

まずは Phase 1-3 で基盤 + コア機能を完成させ、Web 版を先行リリース。
モバイル + 課金は後続フェーズで追加。
