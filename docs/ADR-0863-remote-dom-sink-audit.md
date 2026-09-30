# ADR-0863: remote-string → DOM sink + dialog/focus/capture audit complete

## Status

Accepted (監査完走 — 実害なし、既存防御の確認のみ)

## Context

round612。ADR-0859 (描画 ctx / DOM 注入面)、ADR-0861 (drawio 属性注入)、
ADR-0862 (label-editor cssText 宣言注入) に続く、リモート制御文字列が
ホスト DOM へ到達する全経路の最終走査。あわせて dialog/focus/pointer-capture
のライフサイクル対称性を検証した。

## 走査結果

### 文字列シンク — clean

- **`eval` / `new Function` / `insertAdjacentHTML` / `outerHTML`**: 存在しない。
- **`innerHTML=`**: 静的クリアのみ (動的代入ゼロ、ADR-0859 で固定済)。
- **`style.cssText` へリモート文字列**: 唯一の経路だった label editor は
  ADR-0862 で per-property 代入へ変更済。残 cssText サイトは全て
  静的/数値のみ — `_fontFam` はホワイトリスト返却、`hit.fontSize` は
  intake で数値検証済 (ADR-0367/0369)。
- **`el.style.<prop>=`** 代入: value-typed — `;` による宣言注入は不可。
  不正な色値はブラウザが無視する。
- **`img.src`**: FileReader / blob URL (ローカル由来のみ)。
- **`a.href`**: download blob URL のみ。
- **`a.download=` / `d.value=_dn()` / `document.title` / `el.title=` /
  `dataset`**: 全て value-typed プロパティ代入 — マークアップ到達なし。
  ピアアバターの `el.title` はリモート peer-id (≤64) を属性値として運ぶのみ。
- **`w2.document.write`** (画像ビューア): `_esc` でエスケープ済 + blob URL。
- **`s.link` → `window.open`**: validPatch で `^https?://` ゲート済 (ADR-0326)。
- **`__proto__`/`constructor`/`prototype` キー**: `_cleanVal` が validPatch
  intake で棄却 — shape/patch/wclock の全レイヤでプロトタイプ変異不可
  (ADR-0788/0858)。wclock 辞書は `_wM` null-proto。
- **`location.hash` デコード**: `decodeURIComponent` は try 内 (ADR-0815/0823)。
- **`localStorage`**: キーはホスト定数 (THEME_KEY) — リモート不到達。
- **i18n**: `t(k)` は `T[k] || I18N.en[k] || k` — 欠損キーは en/key へ
  フォールバックし undefined 文字列は出ない。
- **エクスポートピクセル量**: `exportScale` が 16384px/辺・16384²px 総面積で
  bounded — ±1e7 座標でも allocation 爆発なし。

### dialog / focus — clean

- `role="dialog"` は help modal と share modal の 2 つだけ — 両方とも
  `_captureFocus`/`_restoreFocus` 経由 (WCAG 2.4.3)。
- `_openDialog` が canvas ショートカットをゲート。
- プレゼン overlay は `_focusTrigger=_aE()` で capture し `leave()` で
  `_focusTrigger?.focus()` 復帰。
- 編集 overlay (text/label editor) は対象図形の del/hide/lock/ページ離脱で
  畳む (ADR-0556–0560/0569/0572/0684) — 孤立 editor は残らない。

### pointer capture — clean

- canvas `setPointerCapture` → `lostpointercapture` で `_cancelPointerGesture`。
- ミニマップ scrub は `_PU` で `releasePointerCapture` (try/catch 済)。
- hidden/pagehide でジェスチャ+タッチ状態を掃除 (ADR-0604/0608)。

## Decision

本軸の監査はこれで完走とする。新たなリモート文字列シンクを追加する際は:
value-typed プロパティ代入または textContent のみ使用し、cssText/HTML 文字列
構築へリモート値を絶対に流さない。

## Consequences

- リモート→DOM の全既知到達経路が文書化・検証済み。
- 新規 sink 追加時の禁止パターンが明文化された。
- 変更コードなし — 既存防御の確認のみ。
