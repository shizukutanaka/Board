# ADR-0553: ctx メニューの max-height + スクロール

## 状態
実装済 (v1.7.581)

## 背景
多選択時の ctx メニューは全 align/space/match/tidy/export 項目を含み、768px 級の
ビューポートより縦長になる。`openCtxMenu` の位置クランプは
`top = min(y, innerHeight - offsetHeight - 20)` — メニュー高がビューポートを超えると
この値が負になり、**メニュー上端 (Copy/Paste/Delete 等の最重要項目) が画面外にクリップ**
されて到達不能になる。実ブラウザ検証で確認。

## 決定
`.ctx-menu` に `max-height: calc(100vh - 16px); overflow-y: auto` を付与。高さが
ビューポート内に収まるため offsetHeight が上限内に収まり、既存の top クランプが
正しく機能する。加えて top に `_max(8, …)` の下限を設け、上限一杯のメニューでも
上端に 8px の余白を確保。キーボードナビ (ArrowDown/Up) はネイティブの
scroll-into-view で追従するため追加処理不要。

## 影響
- 多選択 ctx メニューが 768px 未満のビューポートでも全項目に到達可能
- スクロールバーは必要時のみ表示 (overflow-y: auto)
- customItems の openExportMenu 等も同じ経路なので同様に安全側
