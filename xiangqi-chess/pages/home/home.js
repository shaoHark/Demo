const app = getApp();

Page({
  data: {
    title: '中国象棋',
    subtitle: '象棋 · 国粹',
    features: [
      { icon: '⚔️', name: '人机对战', desc: '与 AI 一较高下' },
      { icon: '🎯', name: '多种难度', desc: '简单·普通·困难' },
      { icon: '↩️', name: '悔棋功能', desc: '一步定乾坤' }
    ]
  },

  onLoad: function () {
    console.log('首页加载');
  },

  goToModeSelect: function () {
    wx.navigateTo({
      url: '/pages/difficulty/difficulty',
      fail: function (err) {
        console.error('跳转失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  // 双人对战入口（暂未实现）
  onShareAppMessage: function () {
    return {
      title: '一起来下中国象棋吧！',
      path: '/pages/home/home'
    };
  }
});
