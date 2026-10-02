# gkms-sim

学園アイドルマスター HIF のプロデュース評価値を計算するシミュレーターです。

公開ページ: https://umum-tech.github.io/gkms-sim/

## 構成

GitHub Pages で公開されるのは `docs/` フォルダの中身だけです。

| パス | 内容 |
|---|---|
| `docs/index.html` | 画面 |
| `docs/assets/app.js` | 計算ロジック・CSV読込 |
| `docs/assets/style.css` | スタイル（ライト/ダークモード対応） |
| `docs/data/support-cards.csv` | サポートカード一覧 |
| `docs/data/idols.csv` | アイドル一覧 |

## データ更新手順

1. Excel の「サポートカード一覧」「アイドル」シートを CSV で保存する
   - 保存形式は **「CSV UTF-8 (コンマ区切り)」** を推奨（Shift_JIS でも動作しますが、GitHub 上で文字化けして見えます）
2. ファイル名を `support-cards.csv` / `idols.csv` にして `docs/data/` に上書きする
3. コミットしてプッシュする（GitHub の Web 画面から「Add file → Upload files」でも可）
4. 1〜2分で公開ページに反映される

列の並び（見出し名）は変更しないでください。`name`・`sum`・`ability_5`・`VoSP率+` などの見出しを手がかりに読み込んでいます。

## ローカルで確認する

`index.html` をダブルクリックで開くとブラウザの制限で CSV を読み込めません。`docs/` で簡易サーバーを起動して開いてください。

```sh
cd docs
python -m http.server 8000
# → http://localhost:8000/
```
