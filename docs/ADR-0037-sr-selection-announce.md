# ADR-0037: ポインタ選択のスクリーンリーダーアナウンス

## 状態
実装済み (v1.7.95)

## 背景
キーボード経路 (`Tab`/`⇧Tab` の cycleSel) は選択した図形を `UI.toast`
(`aria-live`) 経由で読み上げていたが、**ポインタ経路の選択は無音**だった:

- 図形のクリック/グループ選択 (`pickOrMarquee` の hit 分岐)
- マーキー選択の結果
- `⌘A` / ctxSelectAll の全選択
- `Escape` による選択解除

WCAG 4.1.3 (Status Messages) の観点で、キーボード経路にだけ読み上げがある
非対称は a11y の欠陥 — スクリーンリーダー利用者はポインタ操作による選択
状態の変化を知る術がなかった。

## 決定
- `_announceSel()` ヘルパー: `UI.toast` (既存の aria-live 経路) で
  `0 → t('selNone')` / `1 → describeShape` / `N → n + t('selCount')` を通知。
  1件時は `describeShape` で内容も読み上げ (cycleSel と同じ粒度)。
- 通知点: hit 分岐 (`!alreadySel` のみ — 選択済みの再クリックでは鳴らない)、
  マーキー終了 (0件も「選択を解除」として通知 — 以前の選択が消えた事実)、
  `⌘A`/`ctxSelectAll`、`Escape` (選択があった場合のみ — 空キャンバスの
  Escape で鳴らさない)。
- 新規 i18n キー: `selCount` (ja `個を選択` / en ` selected`)、
  `selNone` (ja `選択を解除` / en `Selection cleared`)。

## 断念した代替案
- 全選択変更を `Store`/`_apply` 経由で一律通知 → リモート op や undo の内部
  復元(origSel)でも鳴ってしまう。利用者の能動的操作に限るため呼出側制御。
- マーキー中のライブ通知 → ドラッグ中に選択が連続変化し、aria-live が
  毎ポインタ移動で発火して逆にノイズ。終了時の最終結果のみ通知。

## 影響
ポインタで選択した図形・件数・解除がスクリーンリーダーに伝わる。
視覚利用者には小さなトーストとしても見える (他のステータスと同経路)。
