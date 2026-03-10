const ja = {
  common: {
    appName: "SwimHub Scanner",
    cancel: "キャンセル",
    delete: "削除",
    deleting: "削除中...",
    back: "戻る",
    or: "または",
    processing: "処理中...",
    close: "閉じる",
    current: "利用中",
  },

  meta: {
    title: "SwimHub Scanner - 手書きタイム記録表をAIで自動デジタル化",
    description:
      "手書きの水泳タイム記録表を撮影するだけでAIが自動解析。デジタルデータに変換して記録管理を効率化します。",
    ogLocale: "ja_JP",
    keywords: [
      "水泳",
      "記録表",
      "手書き",
      "デジタル化",
      "AI",
      "OCR",
      "スイミング",
      "タイム記録",
    ],
  },

  scanner: {
    hero: "手書きの記録表をAIで解析",
    steps: {
      upload: "画像アップロード",
      scanning: "AI解析",
      result: "結果確認・出力",
    },
    status: {
      guestRemaining: "お試し残り:",
      guestUnit: "/ 3回",
      guestHint: "アカウント登録すると毎日無料で使えます",
      premiumLabel: "Premium — 回数無制限",
      dailyRemaining: "今日の残り:",
      dailyUnit: "/ 1回",
      dailyResetHint: "毎日0:00にリセットされます",
      register: "アカウント登録",
      upgrade: "Premium にアップグレード",
    },
    upload: {
      title: "Step 1: 画像アップロード",
      guestExhausted:
        "お試し3回分を使い切りました。アカウント登録（無料）すると、毎日1回使えるようになります。",
      createFreeAccount: "無料アカウントを作成",
      dailyExhausted:
        "今日のトークン（1回/日）を使い切りました。明日0:00にリセットされます。Premiumなら回数無制限で使えます。",
      scan: "解析する",
      printTemplate: "記録表テンプレートを印刷",
    },
    scanning: {
      analyzing: "画像を解析しています...",
      aiReading: "AI が手書きのタイム記録表を読み取っています",
    },
    result: {
      title: "Step 3: 結果確認・修正",
      newScan: "新しいスキャン",
      output: "出力",
      registerMore: "アカウント登録してもっと使う",
    },
    errors: {
      guestTokenExhausted:
        "無料トークンを使い切りました。アカウント登録するとトークンを購入できます。",
      dailyLimitExceeded:
        "利用回数上限に達しました。アカウント登録するとトークンを購入できます。",
      swimmerLimitExceeded: "無料プランでは8名まで解析可能です",
      parseError:
        "画像からタイム情報を読み取れませんでした。鮮明なタイム記録表の画像を使用してください",
      networkError: "ネットワークエラーです。接続を確認してください。",
    },
  },

  uploader: {
    dragDrop: "画像をドラッグ&ドロップ または クリックして選択",
    format: "JPEG / PNG 形式、10MB以下",
    preview: "プレビュー",
    change: "画像を変更",
    errors: {
      invalidFormat: "JPEG または PNG 形式の画像をアップロードしてください",
      tooLarge: "画像サイズは10MB以下にしてください",
    },
  },

  result: {
    distance: "距離",
    repCount: "本数",
    setCount: "セット数",
    circle: "サークル",
    setHeader: "{{n}}セット目",
    no: "No",
    name: "名前",
    style: "種目",
    average: "平均",
    fastest: "最速",
    slowest: "最遅",
    notEntered: "未入力",
    deleteSwimmerConfirm: "を削除しますか？",
    thisSwimmer: "この選手",
    addSwimmer: "+ 選手を追加",
    repHeader: "{{n}}本目",
    deleteTooltip: "削除",
    timeRecord: "タイム記録表",
    timeRecordFile: "タイム記録",
    menu: "メニュー",
  },

  export: {
    image: "画像で出力",
    csv: "CSVで出力",
    excel: "Excelで出力",
  },

  auth: {
    login: "ログイン",
    logout: "ログアウト",
    createAccount: "アカウント作成",
    createNewAccount: "新しいアカウントを作成",
    emailLogin: "メールでログイン",
    email: "メールアドレス",
    password: "パスワード",
    passwordPlaceholder: "6文字以上",
    googleSignIn: "Google でログイン",
    googleSignUp: "Google でサインアップ",
    guestMode: "ログインせずに試す（無料3回）",
    switchToSignUp: "アカウントをお持ちでない方はこちら",
    switchToSignIn: "すでにアカウントをお持ちの方はこちら",
    termsAgree:
      "ログインすることで、利用規約およびプライバシーポリシーに同意したものとします。",
    termsLink: "利用規約",
    privacyLink: "プライバシーポリシー",
    confirmationSent: "確認メールを送信しました",
    confirmationSentDetail:
      "メール内のリンクをクリックして、アカウントを有効化してください。",
    backToLogin: "ログイン画面に戻る",
    loginSubtitle: "手書きタイム記録表をAIで自動デジタル化",
    loadingAuth: "認証情報を確認中...",
    deleteAccount: "アカウントを削除",
    deleteAccountConfirm:
      "アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。\n\n本当に削除しますか？",
    deleteAccountFailed: "アカウントの削除に失敗しました",
    errors: {
      unknown: "不明なエラーが発生しました。",
      invalidCredentials:
        "メールアドレスまたはパスワードが正しくありません。入力内容を確認してから再度お試しください。",
      emailNotConfirmed:
        "メールアドレスまたはパスワードが正しくありません。入力内容を確認してから再度お試しください。",
      tooManyRequests:
        "ログイン試行回数が上限に達しました。しばらく時間をおいてから再度お試しください。",
      alreadyRegistered:
        "アカウントの作成に失敗しました。入力内容を確認してから再度お試しください。",
      weakPassword:
        "パスワードが弱すぎます。より強力なパスワードを設定してください。",
      captcha:
        "Captcha認証が必要です。Captchaを完了してから再度お試しください。",
      rateLimit:
        "リクエスト制限に達しました。しばらく時間をおいてから再度お試しください。",
      network:
        "ネットワークエラーが発生しました。インターネット接続を確認してから再度お試しください。",
      loginFailed:
        "ログインに失敗しました。入力内容を確認してから再度お試しください。",
      loginFailedRetry: "ログインに失敗しました。もう一度お試しください。",
      googleFailed: "Google認証に失敗しました。再度お試しください。",
      generic: "エラーが発生しました。時間をおいて再度お試しください。",
      genericDev: "エラーが発生しました: {{message}}{{status}}",
    },
  },

  notFound: {
    title: "404",
    message: "ページが見つかりませんでした",
    home: "ホームに戻る",
  },

  footer: {
    swimhubDesc: "水泳チームの総合管理",
    timerDesc: "動画にタイムをオーバーレイ",
    scannerDesc: "手書きの記録表をAIで解析",
    scannerFullDesc:
      "手書きの記録表をAIで解析してデジタル化できるWebアプリケーション",
    privacy: "プライバシーポリシー",
    terms: "利用規約",
    support: "サポート",
    contact: "お問い合わせ",
    supportInfo: "サポート・情報",
    serviceList: "SwimHub サービス一覧",
  },

  terms: {
    title: "利用規約",
    metaTitle: "利用規約 | SwimHub Scanner",
    lastUpdated: "最終更新日: 2026年2月23日",
    article1Title: "第1条（適用）",
    article1Body:
      "本利用規約（以下「本規約」）は、SwimHub Scanner（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意の上、本サービスを利用するものとします。",
    article2Title: "第2条（サービス内容）",
    article2Body:
      "本サービスは、手書きのタイム記録表を撮影・アップロードし、AI技術を用いて自動的にデジタルデータに変換するサービスです。",
    article3Title: "第3条（アカウント）",
    article3Items: [
      "ユーザーは、Google または Apple のアカウントを使用して本サービスにログインします。",
      "ユーザーは、自己のアカウントを適切に管理する責任を負います。",
      "アカウントの第三者への譲渡・貸与は禁止します。",
    ],
    article4Title: "第4条（禁止事項）",
    article4Body: "ユーザーは、以下の行為を行ってはなりません。",
    article4Items: [
      "法令または公序良俗に違反する行為",
      "本サービスの運営を妨害する行為",
      "他のユーザーまたは第三者の権利を侵害する行為",
      "不正アクセスまたはこれを試みる行為",
      "本サービスを商用目的で無断利用する行為",
      "その他、運営者が不適切と判断する行為",
    ],
    article5Title: "第5条（有料プラン）",
    article5Items: [
      "本サービスでは、追加機能を利用できる有料プラン（以下「プレミアムプラン」）を提供します。",
      "プレミアムプランの料金は、月額プラン（¥500/月）および年額プラン（¥5,000/年）とします。料金は変更される場合があり、変更時は事前に通知します。",
      "サブスクリプションは、現在の期間が終了する少なくとも24時間前にキャンセルしない限り、同じ条件で自動的に更新されます。",
      "初回登録時には7日間の無料トライアル期間が設けられます。トライアル期間中にキャンセルしない場合、トライアル終了後に自動的に課金が開始されます。",
      "Web経由でのお支払いにはStripeを、モバイルアプリでのお支払いにはApple App Store / Google Playのアプリ内課金（RevenueCat経由）を使用します。",
      "解約はいつでも可能です。Web経由の場合はStripeカスタマーポータルから、モバイルの場合は各ストアのサブスクリプション管理画面から行えます。解約後も、現在の課金期間が終了するまでプレミアム機能を利用できます。",
      "返金については、各決済プラットフォーム（Stripe、Apple App Store、Google Play）のポリシーに準じます。",
    ],
    article6Title: "第6条（免責事項）",
    article6Items: [
      "AI による変換結果の正確性を保証するものではありません。ユーザーは変換結果を確認の上ご利用ください。",
      "本サービスの利用により生じた損害について、運営者は一切の責任を負いません。",
      "本サービスは予告なく変更・停止する場合があります。",
    ],
    article7Title: "第7条（知的財産権）",
    article7Body:
      "本サービスに関する知的財産権は運営者に帰属します。ユーザーがアップロードしたデータの権利はユーザーに帰属します。",
    article8Title: "第8条（規約の変更）",
    article8Body:
      "運営者は、必要に応じて本規約を変更できるものとします。変更後の規約は、本サービス上に掲示した時点で効力を生じます。",
    article9Title: "第9条（準拠法・管轄裁判所）",
    article9Body:
      "本規約は日本法に準拠し、本サービスに関する紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
  },

  privacy: {
    title: "プライバシーポリシー",
    metaTitle: "プライバシーポリシー | SwimHub Scanner",
    lastUpdated: "最終更新日: 2026年2月23日",
    sec1Title: "1. はじめに",
    sec1Body:
      "SwimHub Scanner（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本ポリシーは、本サービスにおける個人情報の取り扱いについて説明します。",
    sec2Title: "2. 収集する情報",
    sec2Body: "本サービスでは、以下の情報を収集します。",
    sec2Items: [
      "アカウント情報: Google または Apple アカウントから提供される名前、メールアドレス、プロフィール画像",
      "アップロードデータ: ユーザーがスキャンのためにアップロードした画像データ",
      "利用状況: サービスの利用日時、利用回数などの統計情報",
    ],
    sec3Title: "3. 情報の利用目的",
    sec3Body: "収集した情報は、以下の目的で利用します。",
    sec3Items: [
      "本サービスの提供・運営",
      "ユーザー認証およびアカウント管理",
      "AI によるタイム記録表の解析・変換処理",
      "サービスの改善・新機能の開発",
      "利用状況の分析・統計処理",
    ],
    sec4Title: "4. 決済情報の取り扱い",
    sec4Body:
      "本サービスの有料プラン（プレミアムプラン）をご利用いただく際、決済処理は以下の外部サービスに委託しており、本サービスがクレジットカード番号等の決済情報を直接保存することはありません。",
    sec4Items: [
      "Stripe, Inc.: Web経由でのサブスクリプション決済処理を委託しています。Stripeは PCI DSS に準拠した決済基盤を提供しています。",
      "RevenueCat, Inc.: モバイルアプリでのサブスクリプション管理を委託しています。Apple App Store / Google Play経由の課金処理はRevenueCatを通じて行われます。",
    ],
    sec4Note:
      "本サービスは、サブスクリプションの状態（有効/無効、プラン種別、有効期限等）のみを管理し、決済情報そのものは上記の委託先が管理します。",
    sec5Title: "5. 第三者への提供",
    sec5Body:
      "以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。",
    sec5Items: [
      "ユーザーの同意がある場合",
      "法令に基づく場合",
      "人の生命・身体・財産の保護に必要な場合",
      "上記の決済処理委託先へのサブスクリプション管理に必要な情報の提供",
    ],
    sec6Title: "6. 外部サービスの利用",
    sec6Body: "本サービスでは、以下の外部サービスを利用しています。",
    sec6Items: [
      "Google / Apple 認証: ログイン機能の提供",
      "Google AI (Gemini): 画像解析・データ変換処理",
      "Supabase: データの保存・管理",
    ],
    sec6Note:
      "各外部サービスのプライバシーポリシーについては、各サービス提供元のサイトをご確認ください。",
    sec7Title: "7. データの保管と削除",
    sec7Items: [
      "アップロードされた画像データは、処理完了後に速やかに削除されます。",
      "アカウント情報は、ユーザーがアカウントを削除するまで保管されます。",
      "アカウント削除を希望される場合は、お問い合わせください。",
    ],
    sec8Title: "8. Cookie について",
    sec8Body:
      "本サービスでは、認証状態の維持のために Cookie を使用しています。ブラウザの設定により Cookie を無効にすることができますが、本サービスの一部機能が利用できなくなる場合があります。",
    sec9Title: "9. ポリシーの変更",
    sec9Body:
      "本ポリシーは、必要に応じて変更されることがあります。重要な変更がある場合は、本サービス上で通知します。",
    sec10Title: "10. お問い合わせ",
    sec10Body:
      "本ポリシーに関するお問い合わせは、本サービス内のお問い合わせ機能よりご連絡ください。",
  },

  support: {
    title: "サポート",
    metaTitle: "サポート | SwimHub Scanner",
    faqTitle: "よくある質問 (FAQ)",
    faqItems: [
      {
        question: "Q. スキャンした結果が正確ではありません",
        answer:
          "鮮明な画像を使用してください。手書きの文字がはっきり読み取れる画像をお勧めします。撮影時は記録表が画像全体に大きく写るようにしてください。",
      },
      {
        question: "Q. 1日の利用回数に制限はありますか？",
        answer:
          "無料プランでは1日あたりの解析回数に制限があります。Premiumプランにアップグレードすると、無制限でご利用いただけます。",
      },
      {
        question: "Q. 対応している記録表の形式は？",
        answer:
          "アプリ内で提供しているテンプレート形式に対応しています。テンプレートはアプリのスキャン画面からPDFまたは画像としてダウンロードできます。",
      },
      {
        question: "Q. アカウントを削除したい",
        answer:
          "アプリ内のアカウント画面から「アカウントを削除」ボタンで削除できます。削除するとすべてのデータが完全に削除されます。",
      },
    ],
    contactTitle: "お問い合わせ",
    contactBody:
      "上記で解決しない場合は、以下のメールアドレスまでお気軽にお問い合わせください。",
    contactEmail: "support@swim-hub.app",
    responseNote: "通常2営業日以内にご返信いたします。",
  },
} as const;

export default ja;
export type TranslationResource = typeof ja;

type DeepStringify<T> = T extends readonly string[]
  ? string[]
  : T extends readonly (infer U)[]
    ? DeepStringify<U>[]
    : T extends Record<string, unknown>
      ? { [K in keyof T]: DeepStringify<T[K]> }
      : string;

export type TranslationShape = DeepStringify<TranslationResource>;
