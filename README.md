# 好鸟哥

竖屏休闲堆叠消除微信小游戏。两张相同即可消除，带合成爆炸、锁块、搬移暂存；无内购，广告变现。

## 导入微信开发者工具

1. 打开 **微信开发者工具** → 小游戏 → 导入
2. 目录选择本仓库根目录（含 `game.js`、`game.json`、`project.config.json`）
3. AppID 可先用测试号；正式上线在 `project.config.json` 里换成你的小游戏 AppID
4. 编译模式必须是 **游戏 / game**，不要当成小程序导入

## 广告位配置（正式上线必做）

在 [微信公众平台](https://mp.weixin.qq.com) → 流量主 → 广告管理 创建广告位，然后打开 `js/config.js`：

```js
ad: {
  rewarded: 'adunit-xxxxxxxx',      // 激励视频：搬移 / 提示 / 洗牌 / 复活
  interstitial: 'adunit-xxxxxxxx',  // 插屏：仅点「下一关」时弹出
  banner: 'adunit-xxxxxxxx'         // Banner：对局页底部常驻
}
```

广告位未配置或播放失败时，激励视频会直接失败，不再使用模拟广告。

## 玩法摘要

- 只能点没有被上层压住的卡牌
- **2 张相同**即可消除（不是 3 张）
- **高级牌是炸弹牌**：金色卡对消后会小范围爆炸清掉周围
- 第 3 关起场上会预放高级牌；同时翻开 4 张同款普通牌也会合成一张高级牌
- 达到本关目标分数即通关，不必清空棋盘
- 锁块：消除与它相邻的 2 张卡后解锁
- 每局 1 次免费搬移，暂存区 2 格；额外次数 / 提示 / 洗牌 / 复活都要看激励视频
- 无法二消且搬移用尽则失败

## 目录

```
game.js                 入口
game.json               竖屏小游戏配置
project.config.json     开发者工具工程（compileType: game）
js/config.js            关卡、分数、广告 ID
js/board.js             堆叠遮挡 / 二消 / 合成 / 锁 / 暂存 / 无尽生成
js/play.js              对局流程与竖屏 UI
js/home.js              首页
js/ad.js                激励 / 插屏 / Banner
js/render.js            扁平卡牌与居家小物绘制
js/main.js              画布、触摸、场景
```

题材为杯子、书本、剪刀、钥匙、花盆、毛巾等居家小物，全部 Canvas 矢量绘制，无需图片资源。
