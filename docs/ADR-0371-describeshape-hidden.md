# ADR-0371: describeShape が hidden 状態をアナウンス

## 状態
承認 — round94

## 背景
DOM mirror (ADR-0041) は `tagHidden` を付記するが、選択アナウンス経路
`describeShape` は visible===0 を無視していた。`origSel` 復元 (ADR-0309)
や RTC `upd` 経由で hidden 図形が selection に残るパスがあり、SR
ユーザーが「見えない図形」を通常図形として読み上げられていた。

## 決定
`describeShape` に `if(s.visible===0)d+=` ${t('tagHidden')}`` を追加 —
mirror と同じ文言キーを再利用し i18n 追加ゼロ。

## 影響
2044 全緑。
