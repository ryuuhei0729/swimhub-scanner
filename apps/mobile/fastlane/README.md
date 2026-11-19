fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios upload_metadata

```sh
[bundle exec] fastlane ios upload_metadata
```

新ロケールのメタデータ (概要/キーワード等) を App Store Connect にアップロード

### ios upload_release_notes

```sh
[bundle exec] fastlane ios upload_release_notes
```

編集中バージョンの「最新情報 (release_notes)」を App Store Connect に反映

options: languages (default: 最新情報が未入力の4ロケール)

### ios upload_screenshots

```sh
[bundle exec] fastlane ios upload_screenshots
```

スクショ (素のまま) を App Store Connect にアップロード

options: languages (default: 新ロケールのみ)

### ios upload_search_metadata

```sh
[bundle exec] fastlane ios upload_search_metadata
```

検索に効く項目 (名前・サブタイトル・キーワード) と宣伝文だけを更新する。概要などには触れない

metadata/<locale>/{name,subtitle,keywords,promotional_text}.txt を読む

名前・サブタイトル・キーワードは編集中のバージョンがあるときしか書き込めない。無いときは公開中の値と比べるだけ

options: apply:true で実際に書き込む (既定は確認のみ)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
