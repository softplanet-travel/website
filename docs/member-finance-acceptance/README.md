# SoftPlanet 會員稱呼與旅行財務工具驗收報告

驗收日期：2026-07-13  
驗收環境：本機 HTTP Server、Chrome in-app browser、訪客資料模式  
範圍：會員稱呼、MUMU 資產、旅行預算／記帳、支付來源、地圖與卡片備註規則

## 1. 修改檔案清單

- `index.html`、`my.html`、`place.html`、`block.html`
- `trip.html`、`trips.html`、`inspiration.html`、`guides.html`、`tools.html`
- `js/home.js`、`js/account.js`、`js/profile-service.js`
- `js/block-workspace.js`、`js/travel-services.js`
- `js/place-detail.js`、`js/inspiration.js`、`js/custom-item-service.js`
- `css/style.css`
- `supabase-schema.sql`
- `README.md`

## 2. 資料表與欄位

- `profiles`：`user_id`、`preferred_name`、`display_name`、`email`、`avatar_url`、`updated_at`
- `trip_budgets`：總預算、主要幣別、分類預算與時間欄位
- `expenses`：補上 `payment_method`、`payment_source_id`、`expense_status`、`short_note`
- `payment_sources`：現金、消費儲值與交通餘額分開保存
- `wallet_transactions`：`initial`、`top_up`、`adjustment`

Schema 為可重複執行的 migration 草案；尚未直接部署至目標 Supabase，也未在外部環境建立 RLS。

## 3. 自訂稱呼邏輯

顯示順序為 `preferred_name` → Google `display_name` → Email 的 `@` 前字串 →「旅人」。帳號設定提供「想讓 MUMU 怎麼稱呼你呢？」；儲存時去除前後空格、拒絕空白、限制 20 字。完整 Email 不會成為主要稱呼。訪客資料留在本機；登入後會嘗試同步 `profiles`，外部 schema 尚未部署時會平順退回本機資料。

## 4. MUMU 品牌資產

首頁 Greeting、登入卡、Loading、Empty、Error、預算提醒、旅行工作區及攻略／工具提示均改走 `.mumu-asset` 單一入口。現階段以既有官方 R2 首頁素材裁切呈現，CSS 變數 `--mumu-asset-url` 是日後替換正式獨立小圖的唯一入口；沒有生成或繪製新熊，也不把一般熊 Emoji 宣稱為正式 MUMU。

## 5. 預算計算方式

- 已花費 = 所有 `paid` 支出換算後總和
- 預排支出 = 所有 `planned` 支出換算後總和
- 預估總支出 = 已花費 + 預排支出
- 剩餘可安排 = 總預算 − 已花費 − 預排支出
- 實際使用百分比 = 已花費 ÷ 總預算
- 預估使用百分比 = 預估總支出 ÷ 總預算

未設定預算時仍可記帳，畫面改為「設定旅行預算」而不顯示百分比。70%、90% 與超過 100% 的提醒使用陪伴語氣，不使用責備或金融警告。

## 6. 預排支出邏輯

`planned` 不計入已花費，但會計入預估總支出與支付後預估餘額。標記為已支付時直接更新原支出，可同時修正實際金額與支付方式，不建立第二筆。取消只改為 `cancelled`，不計入兩種總額。

## 7. 支付方式與支付來源

支出保存固定支付方式與選填 `payment_source_id`。現金、WOWPASS、T-money、NAMANE、Suica／PASMO、其他交通卡等使用共用類型，而使用者建立的「日圓現金」、「WOWPASS 消費餘額」等是獨立支付來源。只有需要追蹤現金／儲值／交通卡餘額時才要求選擇來源。

## 8. 現金與儲值卡帳面餘額

帳面餘額 = 初始餘額 + 儲值 + 校正差額 − 使用該來源的已支付支出。預排支出不立即扣款，另顯示「預排將支出」與「支付後預估餘額」。校正會保留校正前、校正後與時間，不刪除歷史支出。

## 9. 避免儲值重複計算

儲值只寫入 `wallet_transactions` 並增加支付來源餘額，不寫入 `expenses`。只有實際付款才列入旅行花費。介面明示「儲值不是支出」，因此同一筆資金移轉不會與後續消費重複計算。

## 10. 官方卡備註規則

官方景點卡沒有「我的備註」、新增備註按鈕、textarea 或 contenteditable；只保留官方介紹、交通、位置、MUMU 小提醒、附近推薦、地圖與必要 CTA。官方 MUMU 小提醒不可編輯。

## 11. 專屬小卡更名與欄位

介面已統一使用「新增專屬小卡」，不再使用「新增自己的行程卡」。名稱、類型與 Area Master 區域必填；描述最多 100 字並即時顯示字數；地圖分享連結選填；建立後顯示「自己新增」。既有升級機制保留原描述與旅行關聯，不自動替換。

## 12. 驗收流程結果

| 流程 | 結果 | 實際證據 |
|---|---|---|
| A 自訂稱呼 | PASS（本機）；雲端同步待 schema 部署 | 輸入前後有空格的「 花花 」，儲存為「花花」；首頁顯示「花花，今天想去哪裡走走？」 |
| B 旅行總預算 | PASS | 50,000 總預算、10,000 已支付、20,000 預排，得到 30,000 預估、20,000 剩餘、60% 預估使用 |
| C 預排轉已支付 | PASS | 20,000 預排改為 18,000 已支付；支出仍為同一筆、預排列數歸零 |
| D 信用卡 | PASS | 1,200 JPY 顯示約 TWD 252；備註可記海外手續費，但沒有自動加費或回饋 |
| E 現金 | PASS | 日圓現金 50,000 − 1,200 = 48,800；手動校正為 48,000 且支出歷史保留 |
| F WOWPASS 分帳 | PASS | 消費餘額與 T-money 分開建立；餐廳與地鐵分別扣除，彼此不影響 |
| G 儲值不重複計算 | PASS | 儲值 100,000 KRW 後旅行已花費不變；實際消費 20,000 後才增加支出並扣餘額 |
| H 專屬小卡 | PASS | 建立「東京集合點」，Area Master 選新宿、描述與地圖連結保存，顯示「自己新增」 |
| I 官方卡 | PASS | 東京晴空塔沒有可編輯備註，且只有一個「查看地圖」按鈕 |
| J MUMU 資產 | PASS（統一入口） | 指定狀態使用相同正式 R2 素材入口；沒有另行生成熊 |

## 13. Responsive 驗證

逐一在 320、360、375、390、414、768、1024 與 1280px 驗證帳號設定、旅行記帳、預算控管及官方卡。各尺寸均無水平溢出、元素超出容器或 Bottom Navigation 遮住主要操作；稱呼欄、預算卡、支付方式／來源選單與字數提示保持可讀，官方卡始終只有一個地圖按鈕。320–414px 的雙欄摘要會維持可讀卡片；較寬畫面仍使用既有內容型閱讀寬度。

瀏覽器自動化無法真實喚起實體手機輸入法，因此「軟鍵盤開啟」仍建議在 iOS Safari 與 Android Chrome 各做一次裝置 smoke test；現有 safe-area 與底部留白規則已保留。

## 14. 主要畫面截圖

- `01-home-greeting.png`：首頁稱呼與 MUMU
- `02-account-name.png`：帳號稱呼設定
- `03-expense-budget-summary.png`：記帳與預算摘要
- `04-wallet-balances.png`：現金與儲值來源入口
- `05-budget-control.png`：預算控管
- `06-exclusive-card.png`：專屬小卡
- `07-official-card-map.png`：官方卡
- `09-wowpass-separate-balances.png`：日圓現金與 WOWPASS 消費餘額

## 15. 已知限制

1. `supabase-schema.sql` 尚未套用至正式 Supabase，登入後雲端 profile、預算與財務資料同步須待 migration 與 RLS 完成。
2. 專用的小尺寸透明 MUMU 素材尚未提供；目前是可替換的官方 R2 首頁素材裁切，不是新生成熊。
3. 匯率仍是每日快取／示範資料邊界，所有換算只供旅行預算估算。
4. 不連接銀行、卡片或 WOWPASS 等官方 API；畫面只顯示 SoftPlanet 帳面餘額。
5. 實體手機軟鍵盤仍需發布前做一次裝置 smoke test。

## 16. Git Commit

本報告與功能變更會放在同一個 Git Commit；最終 Commit ID 由交付回報列出。
