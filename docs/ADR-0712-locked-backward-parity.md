# ADR-0712 — prop-patch ops の backward も locked skip (wire 収束)

## 状態
採用 (v1.7.738)

## 文脈
`upd`/`style`/`resize`/`align`/`beautify` の forward は locked 図形を skip
するが (ロック自体の op は 'locked' in patch で通過)、backward には同じ
ゲートがなかった。forward と undo の間に lock が届いた場合:

- ローカルの undo が before-props を書き戻す
- しかし undo-wire op (`upd{after:before}` 等) はピアの forward 側で
  locked ゲートにかかり skip される

→ ローカルだけ props が戻りピアは戻らない = **props 発散**。

## 変更
- `case 'upd'` の `if(forward&&sh.locked)break` → `if(sh.locked)break`
  (upd patch は noLock 検証で 'locked' を持てないため後方書込みは常に違法)
- `style`/`resize`/`align`/`beautify` の `!(forward&&sh.locked&&!('locked' in raw))`
  → `!(sh.locked&&!('locked' in raw))` — 'locked' を持つ patch (= lock/unlock
  op 自身の undo) は従来どおり両方向で通過
