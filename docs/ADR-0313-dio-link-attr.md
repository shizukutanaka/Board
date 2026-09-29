# ADR-0313: drawio `link` 属性の往復

## 状態
承認 — round51

## 背景
drawio の「Edit Link」はセルの `link` 属性に URL を保持する。
従来は vertex/edge ともに取込・書出を行っていなかったため
`.drawio` 経由でリンクが欠落していた (Board 側の `s.link` は
ADR-0301/0304/0310 で UI 化済み)。

## 決定
- 輸入: `c.getAttribute('link')` が `https?://` なら `s.link` (500ch cap)
- 書出: vertex/edge 両テンプレートに `link="${esc(s.link)}"` を条件付き emit

## 断念した代替案
- `UserObject` 内の link のみ対応 — mxCell 直属性で十分カバー。

## 影響
.drawio の Edit Link が往復し 🔗 バッジも付く。2021 全緑。
