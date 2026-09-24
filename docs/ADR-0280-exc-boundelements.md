# ADR-0280: excalidraw boundElements 逆リンクを export

## 状態
承認 — round41

## 背景
excalidraw のバインドは双方向: containerId (text→親) と boundElements
(親→text)。従来の export は containerId のみを書き、正規の
denormalized リンクを省略していた。

## 決定
`_ct` 発行後に直前の親要素へ `boundElements=[{id:tid,type:'text'}]`
を付与 — box label / sticky body / conn label の3サイト。

## 断念した代替案
- `E()` 内で事前に text id を生成 — _ct の呼出順を保ったまま
  後付けする方が局所的。

## 影響
export ファイルが excalidraw の正規バインド構造と一致。1987 全緑。
