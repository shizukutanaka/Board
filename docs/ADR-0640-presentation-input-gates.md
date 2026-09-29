# ADR-0640: プレゼン中の残入力経路を _pA ゲート

- 状態: 実装済
- 日付: 2026-09-28

## 背景

プレゼン中は「閲覧専用」のはずが、ゲートは `pointerdown` (`_pA()` return)
と keydown (全抑止) の2経路のみで、以下が素通りだった:

- **dblclick**: `beginText`/`openTextEditor` が overlay 上で開く
  (dblclick は pointerdown を要しない独立イベント)
- **contextmenu**: 右クリックで編集メニューが開き、項目が盤面を変更
- **wheel**: pan/ズームがフィット済みフレームをずらす
- **タッチピンチ** (`_PM` capture): 同上
- **Safari GestureEvent** (gesturestart/change): 同上

## 決定

全5経路へ `_pA()` ガード追加。`_pointers` map の充填は継続
(pointerup/cancel の delete が整合するため)。

## 影響

- プレゼンが真の view-only へ — 矢印/Space/Esc 以外の入力が盤面・
  ビューのいずれも変更しなくなる。増分 ~120B。
