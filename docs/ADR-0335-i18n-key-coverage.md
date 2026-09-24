# ADR-0335: `t()` 呼び出しキーの ja/en 網羅テスト

## 状態
承認 — round65

## 背景
`cycleArrowHead`/`cycleStartHead` が未定義キー `t('styleApplied')`
を呼んでおり、トーストに生キーが出ていた (既存 `stylePasted` に
統一して修正)。静的には検出できなかった。

## 決定
test.mjs に「`t('…')` 参照全てが ja/en 両方に存在」を assert する
ガードを追加。`(?<![A-Za-z0-9_$])t\(` で `set(`/`getContext(` 内の
部分一致を除外。

## 影響
今後 i18n キー漏れが即 fail になる。2043 全緑。
