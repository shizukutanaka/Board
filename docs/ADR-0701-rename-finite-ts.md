# ADR-0701 — 改名 ts の非有限値を棄却 (docName 凍結 DoS)

## 状態
採用 (v1.7.727)

## 文脈
`_vPages` 強化 (ADR-0700) と同型の入力面が docName にも残存: `name` msg の
`msg.ts` と snapshot の `msg.nameTs` は `_iN` (typeof number) のみ検査 —
`Infinity`/`NaN` が素通りし `(ts,writer)` 比較に必勝して `_nameTs` を
汚染 → **以後どんな改名も負けて凍結** (全ピアで)。

## 変更
受理条件を `(_iN(x) ? _fin(x) && _nameWin(...) : !0)` へ:
- **数値だが非有限** → 敵対として改名ごと棄却 (ts を採用しないだけでなく)
- **ts 不在** (旧形式) → 従来通り無条件受理
name msg / snapshot nameTs の2サイト。`_nameTs` への代入も `_fin` 併記。

## 検証
- msg 側 Infinity/NaN 棄却 + 後続の正当改名が受理されること
- snapshot 側 Infinity nameTs で現行名を保持
