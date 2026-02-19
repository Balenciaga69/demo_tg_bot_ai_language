# 菜單插件（Menu）

## 基本菜單設置

```typescript
import { Menu } from '@grammyjs/menu'

// 創建菜單
const menu = new Menu('menu-id')
  .text('Button A', (ctx) => ctx.reply('You pressed A'))
  .row()
  .text('Button B', (ctx) => ctx.reply('You pressed B'))

// 安裝菜單
bot.use(menu)

// 發送菜單
bot.command('start', async (ctx) => {
  await ctx.reply('Choose:', { reply_markup: menu })
})
```

---

## 添加按鈕

### 按鈕類型

```typescript
const menu = new Menu('buttons')
  // 文本按鈕（執行回調）
  .text('Text Button', (ctx) => ctx.reply('Clicked'))

  .row() // 新行

  // URL 按鈕
  .url('Visit Site', 'https://example.com')

  .row()

  // Web App 按鈕
  .webApp('Open App', 'https://example.com/app')

  .row()

  // 請求位置
  .requestLocation('Send Location', (ctx) => {
    const location = ctx.msg.location
  })

  .row()

  // 請求聯系方式
  .requestContact('Send Contact', (ctx) => {
    const contact = ctx.msg.contact
  })
```

---

## 行和布局

### 管理行

```typescript
const menu = new Menu('layout')
  .text('A', () => {})
  .text('B', () => {})
  .text('C', () => {}) // 同一行
  .row() // 換行
  .text('D', () => {}) // 新行
  .text('E', () => {})
  .row()
  .text('F', () => {}) // 單人別行
```

---

## 動態標籤

### 函數型標籤

```typescript
//  標籤可以是函數
let notifications = new Set<number>()

const toggleMenu = new Menu('toggle').text(
  (ctx) => (notifications.has(ctx.from.id) ? '🔔 ON' : '🔕 OFF'),
  (ctx) => {
    const id = ctx.from.id
    if (notifications.has(id)) {
      notifications.delete(id)
    } else {
      notifications.add(id)
    }
    ctx.menu.update() // 更新菜單
  }
)
```

---

## 菜單導航

### 子菜單

```typescript
// 創建子菜單
const settings = new Menu('settings')
  .text('Sound', (ctx) => ctx.reply('Sound settings'))
  .row()
  .text('Brightness', (ctx) => ctx.reply('Brightness'))
  .row()
  .back('Back') // 返回按鈕

const main = new Menu('main')
  .text('Settings', (ctx) => ctx.reply('Opening settings'))
  .submenu('⚙️ Settings', 'settings') // 導航到子菜單
  .row()
  .text('Help', (ctx) => ctx.reply('Help'))

// 註冊層級關係
main.register(settings)

// 只安裝主菜單
bot.use(main)
```

### 手動導航

```typescript
const menu = new Menu('main')
  .text('Go to submenu', (ctx) => {
    ctx.menu.nav('submenu')
  })
  .text('Go back', (ctx) => {
    ctx.menu.back()
  })
```

---

## 酬載（Payloads）

### 存儲菜單數據

```typescript
const menu = new Menu('payload').text({ text: 'Delete', payload: () => Date.now().toString() }, (ctx) => {
  const timestamp = ctx.match // 按鈕生成的 payload
  const age = Date.now() - Number(timestamp)

  if (age < 5000) {
    ctx.reply('Action cancelled')
  } else {
    ctx.reply('Timeout')
  }
})

// payloads 只能存儲小字符串（< 50 bytes）
// 對於大數據，使用 session
```

---

## 動態範圍

### 動態生成按鈕

```typescript
const items = ['Apple', 'Banana', 'Cherry']

const menu = new Menu('dynamic')
  .dynamic(() => {
    const range = new MenuRange()

    for (const item of items) {
      range.text(item, (ctx) => ctx.reply(`Selected: ${item}`)).row()
    }

    return range
  })
  .text('Done', (ctx) => ctx.reply('Finished'))
```

### 從數據庫動態加載

```typescript
const menu = new Menu('db-items').dynamic(async (ctx) => {
  const range = new MenuRange()

  // 從數據庫讀取
  const items = await getItemsFromDB(ctx.from.id)

  for (const item of items) {
    range.text(item.name, (ctx) => ctx.reply(`Chose: ${item.name}`)).row()
  }

  return range
})
```

---

## 更新菜單

### 更新標籤和結構

```typescript
const menu = new Menu('time').text(
  () => new Date().toLocaleTimeString(),
  (ctx) => {
    ctx.menu.update() // 更新菜單
  }
)

// 同時編輯文本
const menu2 = new Menu('edit').text('Edit', async (ctx) => {
  await ctx.editMessageText('Updated text')
  // 菜單自動更新
})
```

### 關閉菜單

```typescript
const menu = new Menu('close').text('Done', (ctx) => {
  ctx.menu.close() // 移除鍵盤
})
```

---

## 回調查詢

### 自動回應

```typescript
// 默認自動回應
const menu = new Menu('auto-answer')

// 禁用自動回應
const menu2 = new Menu('manual-answer', { autoAnswer: false })

bot.on('callback_query:data', async (ctx) => {
  // 手動回應
  await ctx.answerCallbackQuery({
    text: 'Processing...',
    show_alert: true,
  })
})
```

---

## 過期菜單（Outdated Menus）

### 檢測過期

```typescript
// 默認行為：顯示 "Menu was outdated"
const menu = new Menu('default')

// 自訂信息
const menu2 = new Menu('custom', {
  onMenuOutdated: 'Please try again',
})

// 自訂處理
const menu3 = new Menu('handler', {
  onMenuOutdated: async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply('Menu updated, try again')
  },
})

// 禁用檢查（不推薦）
const menu4 = new Menu('no-check', {
  onMenuOutdated: false,
})
```

### 指紋驗證

```typescript
const menu = new Menu('fingerprints', {
  fingerprint: (ctx) => {
    // 返回代表菜單狀態的字符串
    // 狀態改變時，菜單被視為過期
    return ctx.session.menuState?.toString() || 'default'
  },
})
```

---

## 實際範例

### 設置菜單

```typescript
const settingsMenu = new Menu('settings')
  .text(
    (ctx) => (ctx.session.darkMode ? '🌙 Dark' : '☀️ Light'),
    (ctx) => {
      ctx.session.darkMode = !ctx.session.darkMode
      ctx.menu.update()
    }
  )
  .row()
  .text(`Volume: ${ctx.session.volume || 50}%`, (ctx) => {
    ctx.session.volume = (ctx.session.volume || 50) + 10
    if (ctx.session.volume > 100) ctx.session.volume = 0
    ctx.menu.update()
  })
  .row()
  .back('Back')

const mainMenu = new Menu('main')
  .submenu('⚙️ Settings', 'settings')
  .row()
  .text('About', (ctx) => ctx.reply('About this bot'))

mainMenu.register(settingsMenu)
bot.use(mainMenu)
```

### 分頁菜單

```typescript
const itemsPerPage = 5;
let currentPage = 0;
const allItems = ["Item1", "Item2", "Item3", ...]; // 大列表

const pagination = new Menu("pagination")
  .dynamic((ctx) => {
    const range = new MenuRange();
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    const page = allItems.slice(start, end);

    for (const item of page) {
      range.text(item, (ctx) => ctx.reply(`Selected: ${item}`)).row();
    }

    return range;
  })
  .row()
  .text(
    "< Prev",
    (ctx) => {
      currentPage = Math.max(0, currentPage - 1);
      ctx.menu.update();
    }
  )
  .text(
    "Next >",
    (ctx) => {
      currentPage++;
      ctx.menu.update();
    }
  );

bot.use(pagination);
```

### 確認對話框

```typescript
const confirmMenu = new Menu('confirm')
  .text('Yes', (ctx) => {
    ctx.session.confirmed = true
    ctx.reply('Confirmed!')
    ctx.menu.close()
  })
  .text('No', (ctx) => {
    ctx.session.confirmed = false
    ctx.reply('Cancelled!')
    ctx.menu.close()
  })

bot.command('delete', async (ctx) => {
  await ctx.reply('Are you sure?', { reply_markup: confirmMenu })
})
```
