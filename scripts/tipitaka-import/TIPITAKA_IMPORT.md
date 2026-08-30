# Tipitaka インポート

## 目的

このインポーターは、Chaṭṭha Saṅgāyana Tipiṭaka（CST）の書誌関係と本文位置を、表示用のページ階層とは分離して保存する。

ページ階層はナビゲーションを表し、Mūla・Aṭṭhakathā・Ṭīkāの関係は注釈対象を表す。

## 正本

書誌関係の正本は、CST 4 の [`Books.cs`](https://github.com/fsnow/cst/blob/cst4-final/src/CST/Books.cs) である。

`data/Books.cs` はこの公式ファイルの同一内容を保持し、`scripts/convert-romn-to-md/gen-books-data.ts` が `data/books.json` を生成する。

本文位置の基準は、Vipassana Research Institute の [`tipitaka-xml`](https://github.com/VipassanaTech/tipitaka-xml) にある `romn/*.xml` である。

CST の段落移動は [`FormBookDisplay.cs`](https://github.com/fsnow/cst/blob/cst4-final/src/Cst4/FormBookDisplay.cs) と [`tipitaka-latn.xsl`](https://github.com/fsnow/cst/blob/cst4-final/src/Cst4/Xsl/tipitaka-latn.xsl) の挙動に合わせる。

## 現在のカタログ

`books.json` は217ページを定義する。

内訳は、Mūla 61、Aṭṭhakathā 47、Ṭīkā 41、Other 68である。

明示的な注釈対象は125件である。

内訳は、Aṭṭhakathā → Mūla 65件、Ṭīkā → Mūla 37件、Ṭīkā → Aṭṭhakathā 23件である。

1冊の注釈書が複数の物理ファイルを対象にする場合も、`annotationTargetFileNames` の全要素を保存する。

## データモデル

`tipitaka_pages.text_level` は、本文ページに `MULA`、`ATTHAKATHA`、`TIKA`、`OTHER` のいずれかを保存する。

ルートページとカテゴリページの `text_level` は `NULL` である。

`tipitaka_page_annotation_targets` は、注釈ページと対象ページの公式なページ単位関係を保存する。

`segments` は、変換元の `book` 識別子、段落番号、同一段落番号の出現順を `source_book_code`、`source_paragraph_number`、`source_paragraph_occurrence` に保存する。

章番号は位置キーに使わない。

公式XMLでは章を加えても重複段落を一意化できないためである。

`segment_annotation_links` は、対象セグメントと注釈セグメントの解決済みリンクを保存する。

ページ単位関係が正本であり、セグメント単位リンクは再生成可能な索引である。

## 段落リンクの解決

変換時に `<div type="book" id="…">` を `<!--book:…-->` としてMarkdownへ残す。

`{para:N}` は、書籍コード、直前のレベル3見出しの章番号、段落番号、出現順をロケーターとして保存し、同一段落に属する全セグメントへ付ける。

対象側の同じ書籍・章に同じ段落アンカーが複数ある場合、画面上で注釈を対象範囲の後ろへ配置するため、最後のアンカーを選ぶ。

前置セグメントは、旧DBと同様に対象範囲の最初の段落アンカー直前のセグメントへ結ぶ。

完全一致する段落がない場合、CSTと同様に直前の段落アンカーを選ぶ。

ṬīkāがMūlaとAṭṭhakathāの両方を対象にする場合、対象レベルごとに独立してリンクを解決する。

対象アンカーが存在しない段落はリンクを作らず、警告件数として記録する。

この場合も、公式なページ単位関係は保持する。

## 実行

プロジェクト環境内でカタログを再生成する。

```bash
nix develop --command bun scripts/convert-romn-to-md/gen-books-data.ts
```

公式XMLを `tipitaka-xml/romn` に配置し、Markdownへ変換する。

```bash
nix develop --command bun run convert:romn
```

出力先は `tipitaka-md` である。

データベースをmigrationし、インポートを実行する。

```bash
nix develop --command bun run db:migrate
nix develop --command bun run tipitaka
```

`bun run tipitaka` はTursoへの投入後、ローカルWorkers KVの表示用Read Modelも再生成する。

本番KVを更新する場合は、`bun scripts/tipitaka-import.ts --remote-read-model`を使う。

## 原子性と失敗記録

各ページとそのセグメントは、1トランザクションで更新する。

全ページの更新後、ページ単位関係とセグメント単位リンクを同期する。

`import_runs` は実行全体を、`import_files` は `books.json` と各Markdownファイルを追跡する。

読込、変換、保存のいずれかが失敗した場合、対応する行を `FAILED` にし、終了時刻とエラーメッセージを保存する。

同じ入力を再実行した場合は、`catalog_key` とセグメントハッシュを基準に更新し、古いセグメントと古い注釈リンクを削除する。
