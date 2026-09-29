# ADR-0621: move コミットからジェスチャ中に消えた図形を除外

## 状態
実装済 (v1.7.648)

## 背景
`endSelect` の move コミットはドラッグ開始時の図形集合
(`ptr.dragStartShapes`) を `filter(id=>!byId(id)?.locked)` で絞るが、
`byId(id)` が `undefined` (図形が既に消えている) の場合
`!undefined?.locked` → `true` となり**死んだ id が通過する**。

ジェスチャ中に remote del/clear/replace で対象図形が消えると、
`move` op に存在しない id が混ざり:
- ローカル history に phantom エントリ (⌘Z で「何も変わらない undo」)
- 全ピアへ意味のないブロードキャスト (受信側 `byId` で no-op —
  収束は保たれるがノイズ)

同クラスの修正済み経路: `_gresizeCommit`/`_grotCommit` は
`map(byId).filter(Boolean)` で死んだ id を除外済み (先行整合)。

## 決定
`filter(id=>{const s=byId(id);return s&&_ul(s)})` — 「生存 + 非ロック」
で `mids` を構成。`_ul` (unlocked 判定) ヘルパーを再利用。

## 影響
- 収束は元々保たれていた (受信側 no-op) が、history の phantom
  エントリと無駄なワイヤ送信を除去
- 意図と実装の乖離 (locked 除外のはずが dead も通っていた) を解消
