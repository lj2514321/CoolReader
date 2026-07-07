# Changelog

## Unreleased

### UI refinement

- Reworked reader chrome into extracted top, bottom, and more-menu components.
- Moved table of contents, search, and AI actions into the reader bottom bar; removed duplicate theme actions from the more menu.
- Replaced reader top floating island with a full-width top bar and added slide/fade wake animations for top and bottom bars.
- Removed mouse-move UI wake behavior in the reader.
- Added transform-based table-of-contents animation so the reader viewport does not reflow during sidebar transitions.
- Standardized paginated versus scrolled reader scrollbar behavior across EPUB, TXT, and MOBI renderers.
- Shifted home bookshelf and navigation surfaces toward transparent, line-led styling so custom backgrounds remain visible.

## [1.5.4] 鈥?2026-06-15

### 澶氭牸寮忛€傞厤鍣ㄨ矾鐢变慨澶?& UI 浼樺寲

**UX 涓€鑷存€т紭鍖栵紙UX Consistency Improvements锛?*

- **TXT/MOBI 婊氬姩杩涘害鍚屾**锛歍xtAdapter 娣诲姞 scroll 浜嬩欢鐩戝惉瀹炴椂鏇存柊 `charOffset`锛孧obiAdapter 鐩戝惉 iframe body `scrollTop`锛沗useBookEngine` 鏂板 1 绉掑懆鏈熸€?`syncRef.current()` 瀹氭椂鍣紝纭繚 useProgressTimer 姝ｇ‘鎹曡幏 TXT/MOBI 闃呰杩涘害
- **楂樹寒鎸佷箙鍖栦慨澶?*锛歚addHighlight` 绉婚櫎绔犺妭鍖归厤瀹堝崼锛屾墍鏈夐珮浜棤璁哄綋鍓嶇珷鑺傚潎瀛樺叆 `highlightIdMap` 鍜?IndexedDB锛宍renderCurrentChapter()` 閲嶆柊搴旂敤宸叉湁楂樹寒
- **鑷畾涔夋繁鑹蹭富棰?*锛歊eader.tsx 鍔ㄦ€佽绠?CustomTheme 鑳屾櫙鑹插拰浜害锛岄€氳繃 `getLuminance` 鍒ゆ柇 `data-theme="dark"` 鎴?`"light"`锛屼慨澶嶈嚜瀹氫箟涓婚涓嬮潰鏉挎枃瀛椾笉鍙
- **婊氬姩妯″紡 UI 鏄剧ず**锛氭坊鍔?`window.mousemove` 鐩戝惉鍣ㄨ皟鐢?`showControls()`锛屾粴鍔ㄩ槄璇绘椂榧犳爣绉诲姩鑷姩鏄剧ず鎺у埗鏍?
- **楂樹寒澶囨敞杈撳叆**锛歚window.prompt()` 鏇挎崲涓哄唴鑱旇緭鍏ユ锛坄.reader-hl-note-input`锛夛紝閫夊尯宸ュ叿鏍忓睍寮€寮忓娉ㄧ紪杈?
- **AI 鎸夐挳涓婚閫傞厤**锛歚.reader-ai-btn` 浠庡唴鑱旂‖缂栫爜娓愬彉鏀逛负 CSS 绫伙紝light/sepia 鐢?`#818cf8鈫?a78bfa`锛宒ark 鐢?`#667eea鈫?764ba2`
- **閿欒鎻愮ず缁熶竴**锛欰pp.tsx 椤堕儴閿欒妯箙鏀逛负搴曢儴 toast锛坄.app-toast`锛夛紝涓庢嫋鎷藉鍏?toast 鍚堝苟涓虹粺涓€缁勪欢锛? 绉掕嚜鍔ㄦ秷澶?
- **鍏变韩鍔犺浇鍔ㄧ敾**锛歚tokens.css` 鏂板 `.shared-spinner` CSS 鍔ㄧ敾锛堜富棰樻劅鐭ワ級锛孯eadingStats 鍜?AIPanel 缁熶竴浣跨敤
- **inline hover 鈫?CSS :hover**锛歊eaderMarkersPanel 涔︾/楂樹寒鍒犻櫎鎸夐挳銆丷eaderSearchPanel 鎼滅储缁撴灉浠?`onMouseEnter/onMouseLeave` 鏀逛负 CSS 绫?`:hover`
- **涔︾鏍囩浼樺寲**锛歍xtAdapter 浣跨敤绔犺妭鏂囨湰鍓?30 瀛楃锛孧obiAdapter 鏂板 `findTocLabelForChapter()` 浠?TOC 閫掑綊鏌ユ壘绔犺妭鏍囬
- **SettingsPage 鎵佸钩妯″紡**锛歵ab 鎸夐挳銆佹爣绛炬枃瀛椼€侀鑹查瑙堛€佸崰浣嶇浠庡唴鑱?`rgba(255,255,255,...)` 杩佺Щ鍒?CSS 绫伙紙`.settings-bg-tab`銆乣.settings-section-label`銆乣.settings-color-preview`銆乣.settings-placeholder`锛夛紝鍚墎骞充富棰樿鐩?
- **涔︽灦 CSS Token 杩佺Щ**锛歚.book-title`銆乣.book-author`銆乣.book-chapter`銆乣.book-timestamp`銆乣.book-format-badge`銆乣.book-progress-bar`銆乣.continue-reading-progress-bar/meta`銆乣.continue-reading-section-title`銆乣.goal-mini` 鍏ㄩ儴浠庣‖缂栫爜 `rgba(255,255,255,...)` 杩佺Щ鍒?`var(--book-*)` 璁捐 Token
- **涔︽灦鎵佸钩涓婚琛ュ叏**锛氭柊澧?`delete-modal-title/desc`銆乣modal-btn-cancel` 鎵佸钩瑕嗙洊锛汣ontinueReadingCard 绉婚櫎纭紪鐮佹笎鍙?
- **EPUB 瀛椾綋娓叉煋淇**锛歚body, body * { font-family !important }` 鏀逛负鍙屽眰閫夋嫨鍣?鈥?`body` 璁剧疆鍩虹瀛椾綋锛宍body *:not(h1-h6, code, pre)` 寮哄埗瑕嗙洊姝ｆ枃鍏冪礌瀛椾綋锛屾爣棰樹繚鐣欎功绫嶈嚜韬瓧浣撳拰绮楃粏
- **瀛椾綋鐑垏鎹?*锛氭墍鏈?4 澶?EPUB iframe 娉ㄥ叆銆乀xtAdapter銆丮obiAdapter 鐨?`applyLayout()` 鍜?`renderCurrentChapter()` 鍧囨敮鎸?font-family/font-weight 鍗虫椂鏇存柊

**澶氭牸寮忔敮鎸佷慨澶嶏紙Multi-Format Adapter Routing Fix锛?*

- **hooks 灞傚叏闈㈡帴鍏?BookAdapter**锛歚useReaderControls`銆乣useAnnotations`銆乣useSearch` 鎵€鏈夊嚱鏁颁紭鍏堣蛋 `adapterRef`锛宖allback 鍒?epub.js 鐨?`renditionRef`/`bookRef`锛岀‘淇?TXT/MOBI 鏍煎紡鐨勭炕椤点€佹悳绱€侀珮浜€佷功绛俱€佷富棰樺垏鎹€佸竷灞€璋冩暣鍏ㄩ儴姝ｅ父宸ヤ綔
- **BookAdapter 鎺ュ彛鎵╁睍**锛氭柊澧?`applyLayout()`銆乣flow()`銆乣resize()` 涓変釜鏂规硶锛屼笁涓€傞厤鍣ㄥ潎瀹炵幇
- **extractMeta 鎸夋牸寮忓垎娴?*锛歍XT 鐢ㄦ枃浠跺悕浣滄爣棰橈紝MOBI 鐢?`initMobiFile` 鎻愬彇鍏冩暟鎹拰灏侀潰锛孍PUB 璧?epub.js 鈥?淇 TXT 鏂囦欢瀵煎叆宕╂簝闂
- **TxtAdapter offset 璁＄畻淇**锛氱敤姝ｅ垯 `exec` 璁板綍瀹為檯鍒嗛殧浣嶇疆鏇夸唬鍥哄畾 `+2`锛屼慨澶嶄功绛?楂樹寒瀹氫綅鍋忓樊
- **閫夊尯鎹曡幏**锛歍XT/MOBI 鏂板 `mouseup` 鐩戝惉鍣ㄨ皟鐢?`adapter.getSelectionInfo()`锛屾敮鎸佹枃鏈€夋嫨宸ュ叿鏍?
- **楂樹寒鎭㈠**锛歍XT/MOBI 閲嶆柊鎵撳紑涔︾睄鏃堕€氳繃 `adapter.addHighlight()` 鎭㈠宸蹭繚瀛橀珮浜?
- **閬垮厤鍙岄噸閿€姣?*锛歚destroy()` 鍙皟 `adapterRef.destroy()`锛屼笉鍐嶉噸澶嶈皟鐢?`rendition.destroy()`/`book.destroy()`
- **postMessage handler 浼樺寲**锛氶潪 epub 鏍煎紡鏃舵彁鍓?return锛岄伩鍏嶆棤鐢ㄧ殑 iframe 鏌ヨ
- **EPUB 缈婚〉鍔ㄧ敾淇**锛歚goNext`/`goPrev` 鎸?`adapter.format` 鍖哄垎 鈥?EPUB 璧板姩鐢昏矾寰勶紝TXT/MOBI 璺宠繃鍔ㄧ敾

**Bug 淇**

- **saveProgress 绌?cfi 璀﹀憡**锛氭潯浠舵敼涓?`!cfi && !location`锛屾湁 location 鏃朵笉浜х敓鏃ュ織鍣煶
- **bookReadingTime 瀛ょ珛璁板綍**锛歚deleteBook` 鏂板娓呯悊閫昏緫锛屽垹闄や功鏃跺悓姝ユ竻闄ゅ叧鑱旂殑闃呰鏃堕棿璁板綍
- **reader-btn-active 鏍峰紡涓㈠け**锛氶€変腑鐘舵€佹寜閽嚜鍖呭惈瀹屾暣鍩虹鏍峰紡锛屼笉鍐嶄緷璧?`reader-btn` class 鍚屾椂瀛樺湪
- **hookRegistered 浠庝笉澶嶄綅**锛歚hookRegistered.current = false` 鍔犲叆娓呯悊鍧楋紝姣忔鎵撳紑鏂?EPUB 閮介噸鏂版敞鍐?content hook锛屼慨澶嶇浜屾湰鍙婂悗缁?EPUB 涓㈠け甯冨眬鏍峰紡鍜岄€夊尯鑴氭湰鐨勯棶棰?
- **MOBI 閫夊尯鐩戝惉澶辨晥**锛歮ouseup 鐩戝惉浠?`#viewer` div 鏀逛负 `iframe.contentDocument`锛孧OBI 鏂囨湰閫夋嫨鐜板湪姝ｅ父鎹曡幏
- **TXT/MOBI 闃呰鏃堕棿杩借釜**锛歚sessionStartRef`/`todaySecondsRef`/`bookSessionStartRef`/`bookTodayRef` 鍦?TXT/MOBI 鍒嗘敮鍒濆鍖栵紝闃呰鏃堕暱缁熻鐜板湪姝ｅ父
- **TXT/MOBI 鍏冩暟鎹?*锛氳皟鐢?`extractMeta` 鑾峰彇鐪熷疄涔﹀悕/浣滆€?灏侀潰锛堝け璐ユ墠闄嶇骇涓烘枃浠跺悕锛?
- **removeHighlight 瑙嗚娈嬬暀**锛歛dapter 璺緞鐜板湪璋冪敤 `clearHighlights()` 鍚庨噸鏂板簲鐢ㄥ墿浣欓珮浜紝淇濇寔 DOM 涓?DB 涓€鑷?
- **TXT 楂樹寒 DOM 瑕嗙洊**锛歚applyHighlightInDom` 鏀逛负涓€娆℃€ф寜鎵€鏈夐珮浜竟鐣屽垎娈甸噸寤猴紝涓嶅啀 `innerHTML = ''` 閫愪釜瑕嗙洊
- **MOBI scrollTop 澶辨晥**锛歚overflow-y: hidden` 鏀逛负 `auto`锛沗renderCurrentChapter` 鍚庢仮澶?scrollOffset
- **MOBI prev 绔犳湯瀹氫綅**锛氬垏鎹㈠埌涓婁竴绔犳椂婊氬姩鍒板簳閮ㄨ€岄潪椤堕儴
- **syncRef 鍦?TXT/MOBI 鏈缃?*锛歵xt/mobi 鍒嗘敮璁剧疆鍩轰簬 `adapter.getCurrentLocation()` 鐨勫悓姝ュ嚱鏁?
- **EpubAdapter applyLayout 澶辨晥**锛氱洿鎺ユ洿鏂板綋鍓?iframe 鏂囨。鐨?`_reader_layout` style 鍏冪礌锛屼笉鍐嶅彧璋?`themes.select()`
- **custom 涓婚鑳屾櫙闂儊**锛歚themeBg` Record 鏂板 `custom` key锛岄粯璁ゆ祬鑹?
- **TXT 鍒嗛〉绮剧‘鍖?*锛氱敤 DOM `scrollHeight / clientHeight` 瀹炴祴鏇夸唬瀛楃浼扮畻锛涚炕椤垫椂鑷姩婊氬姩鍒?`charOffset` 瀵瑰簲浣嶇疆
- **MOBI 绔犲唴缈婚〉**锛氭寜瑙嗗彛楂樺害鍒嗛〉婊氬姩锛岄暱绔犺妭涓嶅啀涓€娆℃€у叏鏄剧ず锛涜繘搴﹀惈婊氬姩浣嶇疆

**UI 浼樺寲**

- **Aa 甯冨眬闈㈡澘瀹氫綅**锛氫粠 top bar 鍐呴儴绉诲埌 Reader 鏍瑰鍣紝`position: absolute; top: 56px; right: 16px`锛屽湪椤舵爮涓嬫柟灞曞紑
- **闈㈡澘灏哄绾︽潫**锛歚max-width: 280px; max-height: calc(100vh - 120px); overflow-y: auto`锛岃嚜瀹氫箟涓婚灞曞紑鏃朵笉鍐嶆孩鍑?
- **鎸夐挳鍘昏竟妗嗗寲**锛氱Щ闄や富棰樻寜閽殑 `border: 2px solid` 妗嗙嚎锛岀粺涓€鐢?`rgba(99,102,241,0.2)` 娣″簳鑹茶〃绀洪€変腑鐘舵€?
- **z-index 灞傜骇淇**锛歵op bar 鍦ㄩ潰鏉挎墦寮€鏃舵彁鍗囪嚦 `z-index: 60`锛岄潰鏉?`z-index: 61`锛宱verlay `z-index: 55`

## [1.5.3] 鈥?2026-06-07

### 澶氭牸寮忕數瀛愪功鏀寔锛圡ulti-Format Ebook Support锛?

- **缁熶竴閫傞厤鍣ㄦ娊璞?*锛氭柊澧?`BookAdapter` 鎺ュ彛锛坄src/adapters/BookAdapter.ts`锛夛紝鎵€鏈夋牸寮忥紙EPUB/TXT/MOBI/AZW3/PRC锛夐€氳繃缁熶竴鎶借薄灞傛帴鍏ラ槄璇诲櫒锛岄殣钘忓簳灞傝В鏋愪笌娓叉煋宸紓
- **TxtAdapter锛圱XT 鏍煎紡锛?*锛歚src/adapters/TxtAdapter.ts`锛?57 琛岋級锛宒iv 娓叉煋鍣紱鎸?鈮? 杩炵画 `\n\n` 鑷姩鍒嗙珷锛沀TF-8 缂栫爜浼樺厛锛孏B18030 鑷姩鍥為€€鏀寔涓枃 txt锛涙敮鎸佷功绛?鎼滅储/楂樹寒/杩涘害/涓夊涓婚锛涙钀戒綔涓轰吉鐩綍
- **MobiAdapter锛圡OBI 鏍煎紡锛?*锛歚src/adapters/MobiAdapter.ts`锛?04 琛岋級锛宨frame 娓叉煋锛圶SS 瀹夊叏锛夛紱闆嗘垚 `@lingo-reader/mobi-parser` 瑙ｆ瀽 spine/TOC/cover锛汥RM 鍔犲瘑鏂囦欢鍙嬪ソ鎻愮ず"涓嶆敮鎸?DRM 鍔犲瘑鏂囦欢锛岃鐢?Calibre 绛夊伐鍏峰幓 DRM"锛涗功绛?鎼滅储/楂樹寒/杩涘害/涓夊涓婚鍏ㄦ敮鎸?
- **EpubAdapter锛圗PUB 鏍煎紡锛?*锛歚src/adapters/EpubAdapter.ts`锛?01 琛岋級锛岃杽鍖呰灞傦紝淇濈暀鍘熸湁 epub.js 娓叉煋璺緞涓庢墍鏈夌壒鎬э紱`setBook()` 鍚庡悜鍏煎 helper 鎺ュ叆鐜版湁 inline setup
- **鏋舵瀯閲嶆瀯**锛歚useBookEngine` 鏂板 `adapterRef: BookAdapter`锛宍openBook` 鏍规嵁鎵╁睍鍚?dispatch 鍒板搴?adapter锛坱xt/mobi 璧版柊娴佺▼锛宔pub 璧?inline 璺緞锛夛紝淇濈暀 `bookRef`/`renditionRef` 浠ョ淮鎸?sub-hooks锛坄useReaderControls`/`useAnnotations`/`useSearch`锛夊悗鍚戝吋瀹?
- **DB 妯″紡鍗囩骇锛坴8鈫抳9锛?*锛歚src/utils/db.ts` 澧為噺杩佺Щ锛岃€?epub 鏁版嵁闆朵涪澶?鈥?鑷姩涓哄凡瀛樺湪鐨?book 璁剧疆 `format='epub'`锛屽皢 `cfi` 澶嶅埗鍒版柊 `location` 瀛楁锛沗Bookmark`/`Highlight`/`ProgressRecord` 鏂板 `location: string`锛堥€氱敤浣嶇疆瀛楃涓诧紝epub 瀛?CFI锛宼xt/mobi 瀛?`chapterIdx:charOffset`锛?
- **CFI 杩佺Щ鍙岃建杩愯**锛氫繚鐣欐棫 `cfi`/`cfiRange` 瀛楁锛屾笎杩涘紡杩佺Щ鍒版柊 `location` 瀛楁锛涚幇鏈?epub 鐢ㄦ埛鐨勪功绛?杩涘害/楂樹寒鍦ㄩ噸鏋勫悗淇濇寔涓嶅彉
- **鏍煎紡妫€娴嬪伐鍏?*锛歚src/utils/formatDetection.ts` 鎻愪緵 `getFormatFromPath()` 鍜?`isSupportedFile()`锛屾牴鎹墿灞曞悕璇嗗埆 epub/txt/mobi/azw3/prc
- **50MB 鏂囦欢澶у皬闄愬埗**锛歚electron/main/index.ts` 鍦?`readFile` IPC 澶勭悊鍣ㄤ腑鍔?`fs.stat()` 棰勬锛岃秴闄愭枃浠舵嫆缁濆苟鏄剧ず鍙嬪ソ閿欒
- **瀵煎叆娴佺▼鎵╁睍**锛氭枃浠跺璇濇杩囨护鍣ㄤ粠 `['epub']` 鎵╁睍涓?`['epub', 'txt', 'mobi', 'azw3', 'prc']`锛涙嫋鎷介獙璇佸悓姝ユ墿灞曪紱绌虹姸鎬佹彁绀烘枃鏈洿鏂颁负"鐢靛瓙涔︽枃浠?
- **缂栫爜鑷姩妫€娴?*锛歚chardet`锛堜富杩涚▼锛? `iconv-lite`锛圢ode.js 瑙ｇ爜锛夛紝瀹夎涓鸿繍琛屾椂渚濊禆
- **WebDAV 鍚屾閲嶆瀯**锛歚electron/main/webdav.ts` 杩涘害鏂囦欢鎸?`progress/<format>/<basename>.json` 鍒嗙洰褰曞瓨鍌紝閬垮厤涓嶅悓鏍煎紡鍚屽悕鏂囦欢鍐茬獊锛沗BookProgress` 鏂板 `location` 瀛楁锛涗繚鐣欏宸叉湁杩滅▼ `.epub.json` 鏂囦欢鐨勫悗鍚戝吋瀹?
- **涔︽灦鏍煎紡寰界珷**锛歚BookShelf.tsx` 鍦ㄦ瘡鏈功灏侀潰鍙充笂瑙掓樉绀烘牸寮忓窘绔狅紙EPUB/TXT/MOBI锛夛紝鑰?epub 鏁版嵁榛樿鏄剧ず EPUB 寰界珷
- **鍚堝悓娴嬭瘯**锛歚src/adapters/__tests__/contract.test.ts` 缁撴瀯鎬ч獙璇?3 涓?adapter 閮藉疄鐜颁簡 `BookAdapter` 鎺ュ彛鐨勬墍鏈夋柟娉曪紙杩愯闇€ `npm install -D vitest`锛?
- **渚濊禆**锛歚chardet ^2.1.1`銆乣iconv-lite ^0.7.2`銆乣@lingo-reader/mobi-parser ^0.4.6`
- **鎬绘垚鏋?*锛氶槄璇诲櫒浠庡崟鏍煎紡锛圗PUB锛夋墿灞曚负涓夋牸寮忥紙EPUB/TXT/MOBI锛夛紝鎵€鏈夋牸寮忎綋楠岀粺涓€锛涚幇鏈?epub 鏁版嵁瀹屽叏淇濈暀锛涙瀯寤?`npm run build` exit 0

## [1.5.2] 鈥?2026-06-01

### 绫诲瀷绯荤粺娓呯悊锛坅ny Type Cleanup锛?

- **绫诲瀷瀹氫箟缁熶竴**锛歚src/types/electron.d.ts` 鍏ㄩ儴 15+ 涓柟娉曠鍚嶄粠 `any` 鏇挎崲涓哄叡浜被鍨嬶紙`WebDAVConfig`/`AIConfig`/`AIChatMessage`/`SyncResult`/`SyncProgressEvent`锛夛紝娑堥櫎 `[key: string]: any`锛沗electron/preload/index.ts` 鍙傛暟绫诲瀷鍚屾鏄犲皠锛屾秷闄ゅ叏閮?15 涓?`any`锛涘叏灞€鎵╁睍 `File.path?` 鎺ュ彛浠ユ敮鎸?Electron 闈炴爣鍑嗗睘鎬?
- **epub.js 绫诲瀷澧炲己**锛歚src/types/epub.d.ts` 鏂板 `Rendition.manager`銆乣Manager` 瀹屾暣鎺ュ彛锛坈ontainer/settings/isPaginated/layout/views/next/prev/display锛夈€乣View`/`Section`/`Book`/`Spine` 缂哄け灞炴€цˉ鍏咃紝瑕嗙洊 5 涓?epub.js 娑堣垂鏂囦欢锛坄enableSmoothScroll.ts`銆乣animation.ts`銆乣useReaderControls.ts`銆乣epubInit.ts`銆乣useBookEngine.ts`锛?
- **閿欒澶勭悊瑙勮寖鍖?*锛氬叏閮?5 澶?`catch (err: any)` 鏇挎崲涓?`catch (err: unknown)` + `err instanceof Error` 绫诲瀷瀹堝崼锛岃鐩?`AIPanel.tsx`銆乣AISettings.tsx`銆乣SyncSettings.tsx`
- **鏁版嵁璁块棶绫诲瀷淇**锛歚useInitialLoad.ts` 涓?`(r as any).cover` 鏀逛负 `BookRecord` 鎺ュ彛 `cover?: string`锛沗useDragDrop.ts` 涓?`(file as any).path` 鏀逛负 `file.path`
- **娑堥櫎鍐呰仈澹版槑**锛歚src/App.tsx` 涓?`declare global { interface Window { electronAPI } }` 鍐呰仈鍧楀垹闄わ紝绫诲瀷鏉ユ簮缁熶竴鑷?`electron.d.ts`
- **鎬绘垚鏋?*锛歚src/` + `electron/preload/` 鑼冨洿鍐?**0 涓樉寮?`any` 鍓╀綑**锛堢洰鏍囷細鈮?锛夛紝鏋勫缓閫氳繃鐜囦笉鍙?

## [1.5.1] 鈥?2026-05-30

### 鍐呰仈鏍峰紡瑙ｈ€︼紙Style Decouple锛?

- **Reader.tsx**锛?33 琛岀槮韬嚦 724 琛岋紙-22%锛夛紝鍐呰仈 `glass()`/`btn()` 鍑芥暟鏇挎崲涓?`.reader-glass`/`.reader-btn` CSS 绫伙紱7 涓富棰橀鑹插父閲忥紙`fg`/`panelText`/`panelMuted` 绛夛級杩佺Щ鑷?`--reader-*` CSS 鍙橀噺锛汚a 闈㈡澘/鎼滅储/鏍囪/閫夋嫨宸ュ叿鏍?涓婁笅鏂囪彍鍗?AI 鎸夐挳鍏ㄩ儴浣跨敤 CSS 绫?
- **Sidebar.tsx**锛?26 琛屽唴鑱旀牱寮忓畬鍏ㄨВ鑰︼紙0 娈嬬暀 `style={}`锛夛紝`sbTheme` Record 鍒犻櫎锛宍onMouseEnter`/`onMouseLeave` 鏀逛负 CSS `:hover`
- **AIPanel.tsx**锛?81 琛屽唴鑱旀牱寮忓熀鏈畬鍏ㄨВ鑰︼紙浠?1 澶勫姩鎬侀珮搴︽畫鐣欙級锛宍glassStyle` useMemo + `fg`/`muted` 甯搁噺 + `_pulseId` JS keyframes 鍏ㄩ儴鍒犻櫎
- **鏂板 3 涓?CSS 鏂囦欢**锛歚src/styles/components/reader.css`锛?59 琛岋級銆乣sidebar.css`锛?37 琛岋級銆乣ai-panel.css`锛?36 琛岋級锛屾€昏 832 琛屾牱寮忎粠 TSX 杩佺Щ鑷崇嫭绔?CSS
- **涓変富棰樿嚜鍔ㄩ€傞厤**锛歚data-theme="dark|light|sepia"` 灞炴€ч┍鍔?CSS 鍙橀噺鍒囨崲锛宑ustom 妯″紡鏄犲皠涓?light
- **闆跺姛鑳藉彉鏇?*锛氱函鏍峰紡閲嶆瀯锛岀粍浠堕€昏緫/epub.js 闆嗘垚/鎺掗櫎缁勪欢锛圠ibrary/BookShelf/SettingsPage 绛夛級瀹屽叏鏈Е鍙?

## [1.5.0] 鈥?2026-05-30

### UI 涓婚绯荤粺锛堟瘺鐜荤拑 鈫?鍙屼富棰橈級

- 鏂板 CSS 璁捐绯荤粺 `src/styles/tokens.css`锛屽畾涔夊渾瑙?杩囨浮/瀵艰埅鏂囧瓧鑹茬瓑鍏变韩 design token锛屾敮鎾戝弻涓婚鍒囨崲
- 鏂板涓婚鍏ュ彛鏂囦欢 `src/styles/theme.css`锛岀粺涓€绠＄悊 `[data-ui-theme]` 灞炴€ч€夋嫨鍣?
- 鏂板 `src/styles/themes/theme-glass.css`锛堟瘺鐜荤拑涓婚锛夊拰 `src/styles/themes/theme-flat.css`锛堟墎骞充富棰橈級锛岃鐩?TitleBar銆丅ookShelf銆丩ibrary銆丼idebarNav銆丼ettingsPage銆丷eadingStats銆丼yncSettings銆丄ISettings 绛夋墍鏈夐潪 Reader 缁勪欢
- 鏂板 `src/styles/useTheme.ts` React hook锛屾ā鍧楃骇 `sharedTheme` 鍏变韩鐘舵€?+ `listeners` Set 骞挎挱鏈哄埗锛屼换涓€缁勪欢璋冪敤 `setTheme` 鍗虫椂鍚屾鎵€鏈夋秷璐硅€?
- SettingsPage 鏂板 Glass / Flat 鍗曢€夊垏鎹㈠櫒锛屽叆鍙ｅ唴缃?CSS 绫诲垏鎹?

### 鑳屾櫙棰勮涓庝富棰樺垎绂?

- `src/utils/styles.ts` 鏂板 `flatPresets`锛? 濂楁祬鑹叉笎鍙橈細娴呯伆/闇滅櫧/鏄ラ浘/澶╁厜/鏆栧厜/鐜懓锛夊拰 `getPresets(theme)` 杈呭姪鍑芥暟
- Library.tsx 寮曞叆涓婚鎰熺煡鐨?`bgKey` 鍒濆鍖栵紝鍚勮嚜鐙珛 DB 閿瓨鍌紙`bgPreset` / `bgPreset-flat`锛?
- SettingsPage 棰勮缃戞牸鍜屾憳瑕侀殢涓婚鍒囨崲鏄剧ず瀵瑰簲棰勮鍒楄〃锛圙lass 娣辫壊棰勮 / Flat 娴呰壊棰勮锛?

### 鑳屾櫙鐑垏鎹慨澶?

- App.tsx 浠庡崟 `bgGradient` 鐘舵€佹敼涓?`bgByTheme` 鎸変富棰樺瓨鍌紝鍒囨崲涓婚鏃跺嵆鏃跺搷搴旓紝鏃犵紳琛旀帴
- useTheme.ts 浠庡悇鑷嫭绔嬬姸鎬佹敼涓烘ā鍧楃骇 `sharedTheme` + `listeners` Set锛屽交搴曡В鍐冲缁勪欢鐑垏鎹笉涓€鑷撮棶棰?

### 瀵艰埅鏍忔枃瀛楀姣斾慨澶?

- `tokens.css` 鏂板 `--nav-title-color` / `--nav-subtitle-color` CSS 鍙橀噺锛孏lass=鐧借壊锛孎lat=娣辫壊锛孲idebarNav h1/p 棰滆壊浠庣‖缂栫爜鏀逛负 `var(--...)` 寮曠敤
- `SidebarNav.css` Flat 鎸夐挳鏍峰紡锛堟繁鑹叉枃瀛?+ 鐏拌壊鑳屾櫙锛夎ˉ鍏呭畬鏁?

### Flat 甯冨眬淇

- `library.css` 琛ュ厖 Flat 涓婚甯冨眬灞炴€э紙`height:100%`銆乣display:flex`銆乣flex-direction:row` 绛夛級
- 绉婚櫎 Flat 涓?CSS 灞傚 `.library-root` 鑳屾櫙鐨勫己鍒惰鐩?

### 鍐呰仈鏍峰紡杩佺Щ

- 鎵€鏈夐潪 Reader 缁勪欢浠庡唴鑱?`style={...}` 杩佺Щ鍒?CSS class 鏂囦欢锛岀粨鏋勪笌琛ㄧ幇鍒嗙

### 瀵艰埅鏍忔偓鍋滃姩鏁?

- 鏂板缓 `src/components/SidebarNav.css`锛屽疄鐜?scale/bounce/glow 鎮仠鍔ㄧ敾锛坄transform: scale(1.08)`銆佹笎鍙樻壂杩?shimmer銆佸浘鏍囧脊璺?`@keyframes iconBounce`锛?
- SidebarNav.tsx 浠庡唴鑱?style + DOM handler 鏀逛负 CSS class 鍒囨崲锛屼簨浠跺鐞嗕笌鏍峰紡閫昏緫瑙ｈ€?
- 澧炲姞 `:focus-visible` 鐒︾偣鎬佹牱寮忓拰 `@media (prefers-reduced-motion: reduce)` 鍑忓急鍔ㄧ敾鏀寔

---

## [1.4.4] 鈥?2026-05-21

### 缂洪櫡淇

- 淇 child logger 閫氳繃 basicConfig 浼犳挱鐨勯棶棰橈紙50be997锛?

---

## [1.4.1] 鈥?2026-05-20

### 鍔熻兘瀹屽杽

- 锛堝熀浜?1.4.0 涔嬪悗鐨?GitHub Actions CI 娴佺▼瀹屽杽锛?

---

## [1.4.0] 鈥?2026-05-19

### 鍏ㄦ枃鎼滅储

- 闃呰椤?馃攳 鎸夐挳鍞よ捣鎼滅储闈㈡澘锛屾噿鏋勫缓绱㈠紩锛屽ぇ灏忓啓涓嶆晱鎰熷尮閰嶏紝缁撴灉鑷姩璺宠浆楂樹寒

### 涔︾绯荤粺

- 闃呰椤?馃搼 鎸夐挳绠＄悊涔︾/鏍囨敞锛屼功绛惧揩閫熻烦杞紝鍒犻櫎鍙鎸夐挳

### 鏂囨湰鏍囨敞

- 閫変腑鏂囧瓧鍚庢偓娴伐鍏锋爮锛屽洓鑹查珮浜爣璁帮紙榛?缁?钃?绮夛級锛屾寔涔呭寲鍒?IndexedDB

---

## [1.3.6] 鈥?2026-05-19

### 娉ㄩ噴瀵艰埅

- 鐐瑰嚮姝ｆ枃娉ㄩ噴搴忓彿璺宠浆娉ㄩ噴鍐呭锛岃嚜鍔ㄨ繑鍥炲師鏂?

---

## [1.3.5] 鈥?2026-05-18

### 鐩綍瀵艰埅

- 渚ф爮鐩綍鏍戯紝褰撳墠绔犺妭楂樹寒璺熼殢锛岃嚜鍔ㄦ粴鍔ㄥ眳涓紝瀵艰埅绔炴€佷慨澶?

---

## [1.1.0] 鈥?2026-05-10

### 涔︽灦绠＄悊

- 瀵煎叆 EPUB 鏂囦欢锛屽皝闈?鏍囬/浣滆€呭睍绀?
- 鍒犻櫎纭锛堜粎绉诲嚭涔︽灦鎴栧悓鏃跺垹闄ゆ簮鏂囦欢锛?

### 闃呰涓婚

- 浜壊/鏆栭粍/鏆楄壊 涓夌闃呰涓婚锛屾寔涔呭寲璁板繂

### 鑷畾涔夐槄璇讳富棰?

- Aa 闈㈡澘鏀寔绾壊锛堥鑹查€夋嫨鍣?+ 閫忔槑搴︼級鍜屾笎鍙橈紙绾挎€?寰勫悜 + 鑹叉爣缂栬緫鍣級鑷畾涔夎儗鏅?
- 鍐呯疆纰ф捣/鏋佸/鏃ュ嚭/鏋佸厜绱洓濂楅璁?

---

## [1.0.3] 鈥?2026-05-09

### 缂洪櫡淇

- 淇鑻ュ共 bug锛坆7e9669锛?

---

## [1.0.2] 鈥?2026-05-08

### 鑷姩娴佷慨澶?

- 淇鑷姩娴佺浉鍏抽棶棰橈紙6d10039锛?

---

## [1.0.1] 鈥?2026-05-08

### 鑷姩娴?

- 娣诲姞鑷姩娴佸姛鑳斤紙6cc300e锛?

---

## [1.0.0] 鈥?2026-05-08

### 鍒濆鐗堟湰

- 椤圭洰鑴氭墜鏋朵笌閰嶇疆妯℃澘锛?0a0bf5锛?
- Electron + React + TypeScript + epub.js 鐜鎼缓
- 姣涚幓鐠冮鏍硷紙backdrop-filter锛夊叏绐?UI
- 鑷畾涔?frameless 绐楀彛锛屼竴浣撳寲 TitleBar
- 鍩虹闃呰鍣細缈婚〉鍔ㄧ敾锛堟贰鍏ユ贰鍑?宸﹀彸婊戝姩/3D缈讳功/婊戝姩+娣″嚭锛?
- 闃呰杩涘害杩借釜锛堢绾ф寔涔呭寲 IndexedDB锛?
- 6 绉嶆笎鍙樿儗鏅璁撅紝婊戝叆/婊戝嚭浜岀骇椤靛姩鐢?
- 闃呰鏃堕棿杩借釜锛屼粖鏃ラ槄璇绘椂闀跨粺璁★紝涔︽灦椤甸《閮ㄥ睍绀
