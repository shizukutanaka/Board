# ADR-0448: `_fragIn` の n-mismatch 再起動 + dc.onclose の assembly リセット

## 状態
実装済 (v1.7.483)

## 背景
`_fragIn` は snap/opc 共有の単一 assembly `{p,g,n}`。stale partial が
残っている状態で**異なるチャンク数 n の新ストリーム**が来ると、
`sn.n===n` チェックが永久に失敗し `this[key]` が dead partial のまま
固着 — 以後その kind のフラグメント受信は**一切組み立て不能**になる
デッドロックだった (到達経路: dc close→再接続で半受信 assembly が残存、
または中途断絶した転送の再送)。

あわせて `dc.onclose` が `_snapIn`/`_opcIn` をリセットしていなかった
(ADR-0385/0431 は 'failed' 経路のみ) — channel close で partial が残る。

## 決定
- `sn.n!==n` なら assembly を作り直す (fresh stream wins)。
- `dc.onclose` で `_snapIn`/`_opcIn` も null (併せて `_dcQ`、ADR-0446)。

## 影響
- フラグメント再組立がストリーム間で自己治癒 — 半受信状態が永久滞留
  しない。行動テストで n-mismatch 再起動を assert (18 asserts)。
