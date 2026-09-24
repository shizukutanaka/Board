# ADR-0304: s.link の ctx UI (設定/開く)

## 状態
承認 — round49

## 背景
ADR-0301 で excalidraw `link` → `s.link` の往復を入れたが、ユーザー
がリンクを設定・開く導線が無かった (輸入図形のみが持つ読み取り
専用プロパティだった)。

## 決定
- ctx「リンクを設定…」`setSelLink` — prompt で URL を受け、
  https?:// 検証後に style op で全選択図形に適用 (空で解除)。
- ctx「リンクを開く」`openSelLink` — `s.link` 保持時のみ表示、
  `window.open(…,'_blank','noopener')`。

## 断念した代替案
- クリック直にリンク遷移 (ホバーで開く) — 編集ツールと競合する
  ため ctx メニュー導線に限定。
- 全 URL スキーマ許可 — `javascript:` 等を防ぐため https? 限定。

## 影響
ハイパーリンク付き図形が作成・開封可能に (excalidraw 往復済)。
2012 全緑。
