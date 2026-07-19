# BirdStrike Config Tool

BirdStrike コントローラー（GP2040-CE ベースのカスタムファームウェア）を、
**webconfig モードに入らず通常動作のままリアルタイムに設定変更**するための
Web ツールです。WebHID でブラウザから直接コントローラーと通信します。

## 使い方

1. Chrome または Edge で公開ページを開く（WebHID 対応ブラウザが必要です）
2. BirdStrike ファームウェア（設定チャンネル v2 以降）のコントローラーを USB 接続
3. 「接続」→ デバイスを選択

設定変更は即座に本体 RAM へ反映され、「本体に保存」を押した時点で flash に
永続化されます。

## 機能

- ライブビュー（生値/出力のクロスヘア、デッドゾーン・対角スケール可視化）
- 波形ビュー（生値と出力の時系列、RC フィルタ調整用）
- スティック設定: 方向別スケール / デッドゾーン / 感度カーブ / RC フィルタ /
  ノイズゲート（実測ボタン付き）/ 角度補正 / キャリブレーションウィザード
- システム: 入力モード切替（XInput / PS4 / PS5 ほか）、モード切替ボタンコンボの
  割り当て、ライトバー、BOOTSEL / webconfig / 通常再起動
- 未保存変更のトラッキングと破棄

## 開発

```bash
npm install
npm run dev    # http://localhost:8000
npm run build  # dist/ に静的ビルド
```

`main` ブランチへの push で GitHub Actions が自動的に GitHub Pages へ
デプロイします。

## 注意

- 対応ファームウェア側の実装（HID feature report 0x60/0x61 の設定チャンネル）
  が必要です。プロトコル定義は `src/birdstrike.ts` 冒頭を参照してください。
- 本ツールは特定の商用製品・メーカーとは無関係の個人プロジェクトです。

## License

[MIT](./LICENSE)
