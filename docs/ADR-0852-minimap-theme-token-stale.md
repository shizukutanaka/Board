# ADR-0852: matchMedia テーマ変更がミニマップシーンを無効化しない

- Status: Accepted
- Date: 2026-09-30
- Version: 1.7.878

## Context

`Minimap` のシーンビットマップ (`_scene`) は `_gridVer` をキーに再描画を省略する
(ADR-0025)。ビットマップには `--ink`/`--brand` 等のデザイントークンが焼き込まれるため、
トークンが変わる経路では `_gridVer` を待たずに明示的に無効化する必要がある。

render キャッシュ署名監査 (pen bbox/bitmap・img 指紋・wrap・connLabel・_gridVer 連動
キャッシュ全経路) の中で、トークン変更経路の網羅性を確認した:

| 経路 | clearCSSCache | Minimap.invalidateCache |
|---|---|---|
| `applyTheme()` (手動トグル) | ✓ | ✓ |
| `matchMedia('(prefers-color-scheme:dark)')` change | ✓ | **✗** |
| `matchMedia('(forced-colors:active)')` change | ✓ | **✗** |
| `matchMedia('(prefers-contrast:more)')` change | ✓ | **✗** |

## Problem

auto テーマ (`dataset.theme` 未設定) のとき、OS のダークモード切替で
`@media (prefers-color-scheme:dark)` が `--ink`/`--paper`/`--brand-soft` 等を再定義する。
同様に `prefers-contrast:more` が `--ink`/`--line` を再定義する。

matchMedia リスナは `clearCSSCache` (= `_cssCache` 破棄 + `_iv()` 主キャンバス再描画)
だけを呼んでいたため、**主キャンバスは即座に新テーマで描かれるがミニマップだけが
旧テーマ色のシーンビットマップを表示し続けた** — 次の図形 op (`_gridVer` バンプ)
まで色が一致しない状態が継続する。

## Decision

`_tTk` (= `clearCSSCache()` + `Minimap.invalidateCache()`) を導入し、両経路で共有:

- `applyTheme()` — 既に両方呼んでいた → `_tTk()` に集約
- matchMedia 監視ループ — `clearCSSCache` → `_tTk` に変更

「デザイントークンを変える全経路は `_tTk` 一箇所を通る」を不変条件とし、
今後追加されるトークン変更経路も同じヘルパを呼ぶ規約とする。

## Audit 結果 (render キャッシュ署名)

| キャッシュ | キー | 判定 |
|---|---|---|
| `_penBboxCache` | pts ref・n・size・p0/mid/end 座標 | ✓ (drawPen 依存と一致) |
| `_penCache` | + stroke 色 | ✓ (alpha/dash/rotate は呼出側合成層) |
| `_imgCache` | 3 点指紋 (ADR-0035) | ✓ |
| `wrapTextCached` | text・maxWidth・fs・bold・italic・ftt・spacing | ✓ (ADR-0437) |
| `_clCache` (connLabel) | lns・fs・bold・italic・ftt・spacing | ✓ (ADR-0850) |
| minimap `_scene` | `_gridVer` | ✓ → 本 ADR で token 経路を閉塞 |
| DOM mirror / `_grpMap` / `_sq` / snap slot | `_gridVer` (+ `_sqQ` / caller key) | ✓ (`_apply`/`_recordCommitted` が全 op でバンプ) |
| `_cssCache` | CSS var 名 | ✓ → clearCSSCache 全経路を確認 |

## Side finding

監査中に sweep 漏れの切断コメント残片 6 箇所 (pen-bbox memo ブロック、
img.onload minimap 行、union-fill 行、wrapText 正規化行、禁則処理行、
`_stampWrites` ブロック) を発見し、文法を回復する最小補完で修復。
帳尻は wake-lock・pageDel・_lwwDrop コメント圧縮で相殺。

## Verification

- `node test.mjs`: 2830 pass, 0 fail (raw 557,025B < 557,056B)
- ソースピン: `_on(matchMedia(q),_CH,_tTk)` を要求し `clearCSSCache` 直渡しを禁止
