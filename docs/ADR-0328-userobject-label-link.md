# ADR-0328: `<UserObject>` ラッパーの label/link フォールバック

## 状態
承認 — round59

## 背景
draw.io はハイパーリンク付きセルを `<UserObject label="…" link="…">
<mxCell …/></UserObject>` で出力する — `label`/`link` は mxCell で
なく親の UserObject にある。従来は mxCell の `value`/`link` のみ
読んでいたため、実ファイルでラベルとリンクの両方が消失していた。

## 決定
vertex/edge 両ブランチで `_uo` (親が UserObject ならその要素) を
導入し、`value`/`link` に `||(_uo&&_uo.getAttribute('label'|'link'))`
フォールバックを適用。

## 断念した代替案
- `querySelectorAll('UserObject mxCell')` で別途走査 — 既存ループに
  乗せる方が簡潔。

## 影響
drawio の実体「リンク付き図形」がラベル・リンクともに復元される。
2036 全緑。
