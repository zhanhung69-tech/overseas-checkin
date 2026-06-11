# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import re

# 微軟正黑體無 emoji 字形，渲染會變空白框 — 全部濾除
_EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿️‍\U0001F1E6-\U0001F1FF]')
from reportlab.platypus import Paragraph as _Paragraph
def Paragraph(text, style):
    return _Paragraph(_EMOJI.sub('', text).strip(), style)

pdfmetrics.registerFont(TTFont("JH", r"C:\Windows\Fonts\msjh.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("JHB", r"C:\Windows\Fonts\msjhbd.ttc", subfontIndex=0))

TEAL = colors.HexColor("#0E7490")
GREY = colors.HexColor("#5B6B7E")
LINE = colors.HexColor("#D7E0EA")
LIGHT = colors.HexColor("#EFF6FB")
RED = colors.HexColor("#B91C1C")

def st(name, **kw):
    base = dict(fontName="JH", fontSize=10.5, leading=16, wordWrap="CJK",
                textColor=colors.HexColor("#1E2A3A"), spaceAfter=4)
    base.update(kw)
    return ParagraphStyle(name, **base)

S_TITLE = st("t", fontName="JHB", fontSize=22, leading=30, textColor=TEAL, spaceAfter=10)
S_SUB = st("s", fontSize=11, textColor=GREY, spaceAfter=14)
S_H1 = st("h1", fontName="JHB", fontSize=15, leading=22, textColor=TEAL, spaceBefore=14, spaceAfter=6)
S_H2 = st("h2", fontName="JHB", fontSize=12, leading=18, textColor=colors.HexColor("#155E75"), spaceBefore=10, spaceAfter=4)
S_BODY = st("b")
S_LI = st("li", leftIndent=12, bulletIndent=2, spaceAfter=2)
S_NOTE = st("n", fontSize=9, textColor=GREY)

def bullets(items, style=S_LI):
    return [Paragraph(f"•  {x}", style) for x in items]

def facts_table(rows):
    data = [[Paragraph(f"<b>{a}</b>", st("fa", fontName="JHB", fontSize=9.5)),
             Paragraph(b, st("fb", fontSize=9.5))] for a, b in rows]
    t = Table(data, colWidths=[34*mm, 130*mm])
    t.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("BACKGROUND", (0,0), (0,-1), LIGHT),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
    ]))
    return t

def pair_list(title, items):
    out = [Paragraph(title, S_H2)]
    out += bullets([f"<b>{n}</b>｜{d}" for n, d in items])
    return out

DESTS = [
 dict(name="🇹🇼 台灣國內", facts=[("簽證/入境","不需要"),("時差/電壓","無時差／110V（不需轉接頭）"),("貨幣","新台幣 TWD"),("緊急電話","110（警察）／119（救護）"),("旅遊預算概估","每人每日約 NT$1,500–3,500（不含長途交通）")],
  trans=[("高鐵","北高最快 94 分鐘，早鳥 65 折，乘車日前 29 天開賣"),("台鐵","環島皆達，東部主力，新自強號需訂票"),("租車自駕","中南部、花東景點分散最適合，連假提早兩週訂"),("台灣好行+YouBike","景點接駁公車＋市區單車，最省錢")],
  stay=[("商務/連鎖飯店","雙人房 NT$2,500–4,500／晚，車站周邊"),("特色民宿","花東、清境、九份，NT$2,000–4,000／晚"),("溫泉旅館","礁溪、北投、谷關，一泊二食 NT$5,000 起"),("青年旅館","床位 NT$500–900／晚")],
  spots=[("九份・金瓜石","山城老街，黃昏點燈最美"),("日月潭","環湖單車＋纜車＋遊船"),("阿里山","日出雲海森林小火車，祝山線需預訂"),("太魯閣","峽谷步道，出發前查步道開放狀態"),("墾丁","水上活動、龍磐草原星空"),("台南古都","安平古堡、神農街，古蹟＋小吃")],
  foods=[("士林/寧夏夜市","蚵仔煎、雞排、芋圓"),("台南小吃","牛肉湯、鱔魚意麵，早餐開吃"),("逢甲夜市","創新小吃發源地"),("東港海鮮","黑鮪魚季 4–6 月、櫻花蝦")],
  notes=["連假高鐵票開賣即訂，熱門時段秒殺","山區日夜溫差大，夏天也帶薄外套","颱風季 7–9 月留意氣象署警報，東部行程保留彈性","玉山、嘉明湖等需入山入園申請，提前 1 個月","浮潛選有救生員的合法業者，注意離岸流"]),
 dict(name="🇯🇵 日本", facts=[("簽證/入境","免簽 90 天；入境前填 Visit Japan Web 取得 QR Code"),("時差/電壓","快台灣 1 小時／100V 兩腳扁插（台灣電器可直用）"),("貨幣/匯率","日圓 JPY，約 0.21 台幣（出發前查台銀牌告）"),("緊急電話","110（警察）／119（救護）"),("旅遊預算概估","每人每日約 NT$4,000–7,000＋機票約 NT$10,000–15,000")],
  trans=[("區域周遊券","全國 JR PASS 大漲價後，多數行程買區域券（關西/關東廣域/北陸）較划算"),("Suica/ICOCA","手機直接加入 Apple/Google 錢包，地鐵超商通用"),("新幹線","東京⇄大阪 2.5 小時，旺季先在 SmartEX 線上訂指定席"),("地鐵一日券","東京 Metro 24/48/72 小時券；大阪周遊卡含門票")],
  stay=[("商務旅館","東橫INN、APA，雙人房 ¥9,000–15,000／晚"),("溫泉旅館","一泊二食 ¥18,000–40,000／人，箱根、有馬、由布院"),("民宿/町家","京都町家適合 4 人以上包棟，認明民泊登錄編號"),("膠囊旅館","¥3,000–5,000／晚，獨旅省錢")],
  spots=[("東京：淺草・晴空塔・澀谷","首訪經典；teamLab 提前購票"),("京都：清水寺・伏見稻荷","清晨前往避人潮"),("大阪：環球影城","快速通關先買，瑪利歐園區抽整理券"),("奈良公園","餵鹿＋東大寺大佛"),("富士山・河口湖","新宿直達巴士 2 小時"),("北海道","2 月雪祭、7 月富良野薰衣草")],
  foods=[("築地場外市場","海鮮丼、玉子燒，早上 8–10 點"),("道頓堀","章魚燒、大阪燒、串炸"),("錦市場","京都的廚房"),("拉麵名店","機器點餐免日文，避開 12–13 點"),("百貨地下街","閉店前 1 小時熟食半價")],
  notes=["Visit Japan Web 先填好，出示 QR Code 快速通關","同店單日滿 ¥5,000 免稅，掃護照辦理；免稅品出境前不可拆封","車廂內勿講電話；手扶梯關東靠左、關西靠右","垃圾桶極少，自備袋子帶回飯店","不需給小費","小店常見只收現金，日圓現金要備足"]),
 dict(name="🇰🇷 韓國", facts=[("簽證/入境","免簽 90 天；K-ETA 豁免有期限，出發前一個月再確認；填 e-Arrival Card 加速通關"),("時差/電壓","快台灣 1 小時／220V 圓形兩腳插（必帶轉接頭）"),("貨幣/匯率","韓元 KRW，約 0.023 台幣"),("緊急電話","112（警察）／119（救護）"),("旅遊預算概估","每人每日約 NT$3,000–5,500＋機票約 NT$7,000–12,000")],
  trans=[("AREX 機場快線","仁川→首爾站 43 分鐘約 ₩11,000；機場巴士直達飯店區"),("T-money 卡","地鐵公車超商通用，地鐵單程約 ₩1,500"),("Naver Map/KakaoMap","Google Maps 在韓國不準，必裝在地地圖"),("KTX 高鐵","首爾⇄釜山 2.5 小時，外國人 Korail PASS 划算")],
  stay=[("明洞/東大門","購物最方便，雙人房 ₩120,000–200,000／晚"),("弘大/合井","年輕夜生活區，機場快線直達"),("韓屋體驗","北村、全州，地暖炕房 ₩80,000–150,000／晚"),("釜山海雲台","海景飯店，8 月旺季價格翻倍")],
  spots=[("景福宮・北村韓屋村","穿韓服免費入宮；週二休館"),("明洞・東大門","美妝購物＋深夜批發"),("樂天世界/愛寶樂園","外國人優惠票線上先買"),("南怡島・小法國村","追劇景點一日遊，秋天銀杏最美"),("釜山甘川洞・海雲台","彩色山城＋海景列車"),("濟州島","城山日出峰、牛島")],
  foods=[("廣藏市場","綠豆煎餅、麻藥飯捲"),("烤肉一條街","五花肉配燒酒，二人份起跳"),("明洞餃子・土俗村人蔘雞","米其林推薦＋排隊名店"),("釜山豬肉湯飯","西面 24 小時營業"),("炸雞＋啤酒","外帶回飯店配漢江便利商店啤酒")],
  notes=["K-ETA 豁免措施有期限，出發前務必確認最新規定","餐廳多兩人份起跳，獨旅選市場、飯捲店","退稅單筆滿 ₩15,000 即可，市區即時退稅最方便","地鐵粉紅色博愛座完全不要坐，文化上極敏感","冬季常 -10°C，發熱衣＋羽絨外套＋暖暖包必備"]),
 dict(name="🇹🇭 泰國", facts=[("簽證/入境","免簽（措施有期限，出發前確認）；入境前 72 小時填 TDAC 數位入境卡（官網免費）"),("時差/電壓","慢台灣 1 小時／220V 多為萬用插座"),("貨幣/匯率","泰銖 THB，約 0.95 台幣"),("緊急電話","1155（觀光警察，有中文服務）"),("旅遊預算概估","每人每日約 NT$2,200–4,500＋機票約 NT$7,000–12,000")],
  trans=[("BTS/MRT","曼谷空鐵地鐵避塞車，單程 ฿17–62，感應信用卡可直刷"),("Grab","東南亞版 Uber，明碼標價不怕喊價"),("嘟嘟車","體驗用，上車前先談價，短程 ฿60–100 合理"),("國內線","曼谷飛清邁/普吉 1.5 小時，促銷常見千元內")],
  stay=[("曼谷市區飯店","BTS 站旁四星 ฿1,500–3,000／晚，CP 值極高"),("泳池別墅","華欣、普吉包棟，4–8 人分攤每人千元有找"),("清邁老城民宿","古城內 ฿800–1,500／晚"),("海島度假村","普吉、蘇美；5–10 月西岸雨季價格砍半但浪大")],
  spots=[("大皇宮・臥佛寺・鄭王廟","需過膝有袖服裝"),("洽圖洽週末市集","萬攤規模，只開六日，早上去"),("美功鐵道+水上市場","經典半日團"),("清邁古城・雙龍寺","11 月水燈節最夢幻"),("普吉 PP 島跳島","選有保險的正規船公司"),("大城遺址","世界遺產樹中佛頭")],
  foods=[("米其林街頭小吃","痣姐蟹肉蛋捲（需預約）、水門海南雞飯"),("Thip Samai","泰式炒河粉創始名店"),("芒果糯米飯","4–6 月芒果季最甜"),("清邁咖哩麵 Khao Soi","北泰靈魂料理"),("建興酒家","咖哩蟹＋蝦醬空心菜")],
  notes=["TDAC 認明官方網站，勿用收費代辦","寺廟服裝嚴格：過膝＋有袖，脫鞋入殿","不摸任何人的頭；對皇室言論極度敏感","自來水不可生飲","「大皇宮今天關門」是經典騙術，直接無視","床頭小費 ฿20–50、按摩後 ฿50–100","4 月潑水節全國潑水，手機防水袋必備"])]

story = []
story.append(Paragraph("旅遊規劃完整指南", S_TITLE))
story.append(Paragraph("台灣國內 ・ 日本 ・ 韓國 ・ 泰國｜交通、住宿、景點、美食、注意事項、攜帶清單與預算試算", S_SUB))

story.append(Paragraph("📦 本系統三件套使用說明", S_H1))
story += bullets([
 "<b>旅遊規劃系統.html</b>｜互動主系統：選目的地、設人數天數、即時試算預算、編行程、勾清單，可匯出 CSV／.ics 行事曆／列印 PDF，資料自動儲存於瀏覽器。",
 "<b>旅遊預算試算表.xlsx</b>｜Excel 版：改「目的地下拉選單／天數／人數」即自動重算，含行程表與攜帶清單工作表。",
 "<b>本 PDF</b>｜可列印隨身攜帶的完整攻略。"])

story.append(Paragraph("💰 預算計算公式", S_H1))
story += bullets([
 "總預算 ＝（機票×人數 ＋ 住宿×人數×晚數 ＋ (餐飲＋交通＋門票＋保險)×人數×天數 ＋ 購物×人數）× 1.1（含 10% 預備金）",
 "小孩以半價計入「有效人數」；住宿晚數 ＝ 天數 − 1",
 "風格係數：省錢背包 ×0.8、標準舒適 ×1.0、豪華享受 ×1.5（套用於住宿/餐飲/交通/門票）"])

story.append(Paragraph("🗓️ 出發前準備時間軸（從規劃到出發）", S_H1))
tl = [("出發前 60–90 天","訂機票（促銷期最便宜）、確認護照效期 6 個月以上、規劃請假"),
      ("出發前 30 天","訂住宿、確認簽證/入境規定（K-ETA、TDAC、Visit Japan Web）、買旅平險＋不便險"),
      ("出發前 14 天","訂熱門餐廳/門票（USJ、teamLab）、換外幣現金、買 eSIM/WiFi 機"),
      ("出發前 7 天","填電子入境卡、列印訂房證明、確認天氣調整衣物清單"),
      ("出發前 1 天","用清單逐項打勾、手機下載離線地圖、行動電源充飽（須手提上機）"),
      ("出發當天","護照/錢包/手機三確認；國際線提早 3 小時到機場")]
story.append(facts_table(tl))

for d in DESTS:
    story.append(PageBreak())
    story.append(Paragraph(d["name"], S_TITLE))
    story.append(Paragraph("基本資訊", S_H2))
    story.append(facts_table(d["facts"]))
    story += pair_list("🚆 交通方式", d["trans"])
    story += pair_list("🏨 住宿選擇", d["stay"])
    story += pair_list("📍 可玩景點", d["spots"])
    story += pair_list("🍜 美食推薦", d["foods"])
    story.append(Paragraph("⚠️ 注意事項", S_H2))
    story += bullets(d["notes"])

story.append(PageBreak())
story.append(Paragraph("🎒 攜帶物品總清單", S_TITLE))
story.append(Paragraph("🔴 必帶（所有目的地）", S_H2))
story += bullets(["護照（出國，效期 6 個月以上）／身分證健保卡（國內）","手機＋充電線＋行動電源（≤100Wh 手提上機）","現金（台幣＋外幣，小額多換）＋信用卡（開通海外刷卡與感應）","網路：eSIM 或 WiFi 分享器（出國）","常用藥品、處方藥（含藥單）＋腸胃藥","訂房／機票證明（紙本＋手機截圖各一份）","旅遊平安險＋不便險保單（出國）","緊急聯絡人資訊卡、護照影本（與正本分開放）"])
story.append(Paragraph("🟡 依目的地加帶", S_H2))
story.append(facts_table([("日本","Visit Japan Web QR、折疊購物袋（袋子收費）、好走的鞋、冬季保濕"),
 ("韓國","轉接頭（220V 圓孔）、Naver Map/Papago App、冬季發熱衣＋暖暖包、空行李袋"),
 ("泰國","TDAC QR、防曬 SPF50、防蚊液（登革熱）、手機防水袋、進寺廟長褲/披肩"),
 ("台灣","悠遊卡/一卡通、薄外套（山區）、防蚊液、泳衣（溫泉/海邊）")]))
story.append(Spacer(1, 8))
story.append(Paragraph("📌 即時資訊查詢：外交部領事事務局（旅遊警示）boca.gov.tw｜台銀匯率 rate.bot.com.tw/xrt｜中央氣象署 cwa.gov.tw。本指南為 2026 年 6 月編寫之概估資訊，簽證與免簽措施具時效性，出發前請以官方公告為準。", S_NOTE))

doc = SimpleDocTemplate(r"C:\Users\zhanh\OneDrive\桌面\AI練習區\旅遊規劃系統\旅遊規劃完整指南.pdf",
                        pagesize=A4, topMargin=18*mm, bottomMargin=16*mm,
                        leftMargin=18*mm, rightMargin=18*mm,
                        title="旅遊規劃完整指南", author="Trip Planner")
doc.build(story)
print("PDF OK")
