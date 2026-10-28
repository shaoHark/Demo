const app = getApp();

Page({
  data: {
    // 注意：WXML 模板不能使用 JS 表达式，所以所有数组和文本都在 data 中预计算
    difficulties: [
      { key: 'easy', label: '简单', stars: 1, desc: 'AI 搜索浅，适合初学者' },
      { key: 'normal', label: '普通', stars: 2, desc: '适中挑战，推荐入门玩家' },
      { key: 'hard', label: '困难', stars: 3, desc: '深度搜索，高手挑战' }
    ],
    // 显示星级字符串
    starTexts: ['⭐', '⭐⭐', '⭐⭐⭐'],
    selectedIndex: 1,
    selectedKey: 'normal',
    selectedLabel: '普通'
  },

  onLoad: function () {
    // 恢复上次选择
    const lastDifficulty = wx.getStorageSync('lastDifficulty');
    if (lastDifficulty) {
      const idx = this.data.difficulties.findIndex(d => d.key === lastDifficulty);
      if (idx >= 0) {
        this.setData({
          selectedIndex: idx,
          selectedKey: lastDifficulty,
          selectedLabel: this.data.difficulties[idx].label
        });
      }
    }
  },

  onSelectDifficulty: function (e) {
    const idx = e.currentTarget.dataset.index;
    const diff = this.data.difficulties[idx];
    this.setData({
      selectedIndex: idx,
      selectedKey: diff.key,
      selectedLabel: diff.label
    });
  },

  goToGame: function () {
    const diff = this.data.selectedKey;
    // 保存选择
    wx.setStorageSync('lastDifficulty', diff);
    app.globalData.difficulty = diff;

    wx.redirectTo({
      url: '/pages/game/game?difficulty=' + diff,
      fail: function (err) {
        console.error('跳转失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  goBack: function () {
    wx.navigateBack();
  }
});
