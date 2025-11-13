# アクセスログ設定ガイド

このプロジェクトでアクセスログを記録するための設定方法です。

## 設定手順

### 1. Google Sheetsでスプレッドシートを作成

1. [Google Sheets](https://sheets.google.com) にアクセス
2. 新しいスプレッドシートを作成
3. シート名を「アクセスログ」に変更
4. 1行目に以下のヘッダーを入力：
   ```
   タイムスタンプ | 日付 | 時刻 | URL | リファラー | ユーザーエージェント | 画面幅 | 画面高さ | ビューポート幅 | ビューポート高さ | 言語 | タイムゾーン
   ```

### 2. Google Apps ScriptでWebhookを作成

1. [Google Apps Script](https://script.google.com) にアクセス
2. 「新しいプロジェクト」をクリック
3. 以下のコードを貼り付けてください：

```javascript
// アクセスログを記録するGoogle Apps Script
// スプレッドシートIDを設定してください
const SPREADSHEET_ID = 'https://docs.google.com/spreadsheets/d/1kshDopEBMw-7chK-TyV8_vp9Qhwe25ScoZ-BYmIJnL8/edit?usp=sharing'; // スプレッドシートのIDを貼り付け
const SHEET_NAME = 'アクセスログ'; // シート名

function doPost(e) {
  try {
    // スプレッドシートを開く
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // リクエストデータを取得
    const data = JSON.parse(e.postData.contents);
    
    // データを配列に変換
    const row = [
      data.timestamp || new Date().toISOString(),
      data.date || new Date().toLocaleDateString('ja-JP'),
      data.time || new Date().toLocaleTimeString('ja-JP'),
      data.url || '',
      data.referrer || '直接アクセス',
      data.userAgent || '',
      data.screenWidth || '',
      data.screenHeight || '',
      data.viewportWidth || '',
      data.viewportHeight || '',
      data.language || '',
      data.timezone || ''
    ];
    
    // シートに追加
    sheet.appendRow(row);
    
    // 成功レスポンスを返す
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // エラーレスポンスを返す
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// テスト用の関数（オプション）
function test() {
  const testData = {
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('ja-JP'),
    time: new Date().toLocaleTimeString('ja-JP'),
    url: 'https://example.com',
    referrer: 'https://google.com',
    userAgent: 'Mozilla/5.0',
    screenWidth: 1920,
    screenHeight: 1080,
    viewportWidth: 1920,
    viewportHeight: 1080,
    language: 'ja-JP',
    timezone: 'Asia/Tokyo'
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  doPost(mockEvent);
}
```

### 3. スプレッドシートIDを設定

1. Google Apps Scriptのコード内の `SPREADSHEET_ID` を、作成したスプレッドシートのIDに置き換えます
2. スプレッドシートのIDは、URLの `/d/` と `/edit` の間の文字列です
   - 例: `https://docs.google.com/spreadsheets/d/1ABC123...XYZ/edit`
   - ID: `1ABC123...XYZ`

### 4. Webアプリとして公開

1. Google Apps Scriptのエディタで「デプロイ」→「新しいデプロイ」をクリック
2. 種類の選択で「ウェブアプリ」を選択
3. 以下の設定を行います：
   - **説明**: 「アクセスログ記録」
   - **次のユーザーとして実行**: 「自分」
   - **アクセスできるユーザー**: 「全員」（または「匿名ユーザー」）
4. 「デプロイ」をクリック
5. 表示されたWebアプリのURLをコピーします（例: `https://script.google.com/macros/s/ABC123...XYZ/exec`）

### 5. main.jsにURLを設定

1. `main.js` ファイルを開く
2. 以下の行を探します：
   ```javascript
   const ACCESS_LOG_WEBHOOK_URL = null; // 使用する場合はURLを設定
   ```
3. `null` をコピーしたWebアプリのURLに置き換えます：
   ```javascript
   const ACCESS_LOG_WEBHOOK_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
   ```

## 記録される情報

- **タイムスタンプ**: ISO形式の日時
- **日付**: 日本語形式の日付
- **時刻**: 日本語形式の時刻
- **URL**: アクセスしたページのURL
- **リファラー**: どこから来たか（検索エンジン、他のサイトなど）
- **ユーザーエージェント**: ブラウザ情報
- **画面サイズ**: ユーザーの画面解像度
- **ビューポートサイズ**: ブラウザウィンドウのサイズ
- **言語**: ブラウザの言語設定
- **タイムゾーン**: ユーザーのタイムゾーン

## 注意事項

- アクセスログの記録に失敗しても、サイトの動作には影響しません
- プライバシーに配慮し、個人を特定できる情報（IPアドレスなど）は記録していません
- 大量のアクセスがある場合は、Google Apps Scriptの実行時間制限に注意してください

## トラブルシューティング

### ログが記録されない場合

1. ブラウザの開発者ツール（F12）のコンソールでエラーメッセージを確認
2. Google Apps Scriptの実行ログを確認（「実行」→「実行ログを表示」）
3. スプレッドシートのIDが正しいか確認
4. Webアプリの公開設定で「全員」がアクセスできるようになっているか確認

### 権限エラーが発生する場合

1. Google Apps Scriptで「承認が必要です」と表示されたら、承認を実行
2. スプレッドシートの共有設定で、スクリプトがアクセスできるようにする

