const engine = require('../../utils/chess-engine.js');
const ai = require('../../utils/chess-ai.js');

Page({
  data: {
    difficulty: 'normal',
    difficultyLabel: '普通',
    turnSide: 1,          // 1=红方, -1=黑方
    aiThinking: false,
    tipText: '',
    undoEnabled: false,
    gameOver: false,
    winner: null
  },

  // 页面状态（非响应式，避免频繁 setData）
  _state: {
    board: null,
    selected: null,        // {r, c} 选中棋子位置
    hintMoves: [],         // 选中棋子的可走位置
    history: [],           // 历史记录用于悔棋 [{board: copy}]
    canvas: null,
    ctx: null,
    canvasWidth: 0,
    canvasHeight: 0,
    // 棋盘绘制参数（在 onReady 中计算）
    boardX: 0,             // 棋盘左上角 x
    boardY: 0,             // 棋盘左上角 y
    cellW: 0,              // 每格宽度
    cellH: 0,              // 每格高度
    pieceRadius: 0,        // 棋子半径
    redCross: true         // 红方在上方还是下方 (true=红在上)
  },

  // 难度标签映射
  _diffLabels: { easy: '简单', normal: '普通', hard: '困难' },

  onLoad: function (options) {
    const diff = options.difficulty || 'normal';
    this.setData({
      difficulty: diff,
      difficultyLabel: this._diffLabels[diff] || '普通'
    });
  },

  onReady: function () {
    this._initGame();
  },

  // 初始化游戏
  _initGame: function () {
    this._state.board = engine.createInitialBoard();
    this._state.selected = null;
    this._state.hintMoves = [];
    this._state.history = [];

    this.setData({
      turnSide: 1,
      gameOver: false,
      winner: null,
      undoEnabled: false,
      tipText: ''
    });

    // 初始化 Canvas
    this._initCanvas();
  },

  // 初始化 Canvas 2D
  _initCanvas: function () {
    const that = this;
    wx.createSelectorQuery()
      .select('#chessCanvas')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0]) {
          console.error('Canvas 初始化失败');
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;

        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        that._state.canvas = canvas;
        that._state.ctx = ctx;
        that._state.canvasWidth = res[0].width;
        that._state.canvasHeight = res[0].height;

        // 计算棋盘绘制参数
        that._calcBoardParams();

        // 首次渲染
        that._renderAll();
      });
  },

  // 计算棋盘绘制参数
  _calcBoardParams: function () {
    const s = this._state;
    const w = s.canvasWidth;
    const h = s.canvasHeight;

    // 棋盘整体居中，留边距
    const margin = 20;
    // 9 列线 => 8 格宽，10 行线 => 9 格高
    const availW = w - margin * 2;
    const availH = h - margin * 2;

    // 按比例计算，让格子尽量接近正方形
    const cellW = availW / 8;
    const cellH = availH / 9;
    const cell = Math.min(cellW, cellH);

    // 居中棋盘
    const boardW = cell * 8;
    const boardH = cell * 9;
    s.boardX = (w - boardW) / 2;
    s.boardY = (h - boardH) / 2;
    s.cellW = cell;
    s.cellH = cell;
    s.pieceRadius = cell * 0.42;
  },

  // 全局渲染
  _renderAll: function () {
    if (!this._state.ctx) return;
    const ctx = this._state.ctx;
    const w = this._state.canvasWidth;
    const h = this._state.canvasHeight;

    // 清空画布
    ctx.clearRect(0, 0, w, h);
    // 棋盘背景
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(0, 0, w, h);

    this._drawBoard();
    this._drawPieces();
    this._drawSelection();
    this._drawHints();
  },

  // 绘制棋盘格线
  _drawBoard: function () {
    const ctx = this._state.ctx;
    const { boardX, boardY, cellW, cellH } = this._state;

    ctx.strokeStyle = '#3D2817';
    ctx.lineWidth = 1.5;

    // 画横线 (10 条)
    for (let r = 0; r < 10; r++) {
      const y = boardY + r * cellH;
      ctx.beginPath();
      ctx.moveTo(boardX, y);
      ctx.lineTo(boardX + 8 * cellW, y);
      ctx.stroke();
    }

    // 画竖线
    for (let c = 0; c < 9; c++) {
      const x = boardX + c * cellW;
      if (c === 0 || c === 8) {
        // 边缘竖线画满
        ctx.beginPath();
        ctx.moveTo(x, boardY);
        ctx.lineTo(x, boardY + 9 * cellH);
        ctx.stroke();
      } else {
        // 中间竖线在楚河汉界处断开
        ctx.beginPath();
        ctx.moveTo(x, boardY);
        ctx.lineTo(x, boardY + 4 * cellH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, boardY + 5 * cellH);
        ctx.lineTo(x, boardY + 9 * cellH);
        ctx.stroke();
      }
    }

    // 九宫格斜线 - 上半（黑方）
    ctx.beginPath();
    ctx.moveTo(boardX + 3 * cellW, boardY);
    ctx.lineTo(boardX + 5 * cellW, boardY + 2 * cellH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(boardX + 5 * cellW, boardY);
    ctx.lineTo(boardX + 3 * cellW, boardY + 2 * cellH);
    ctx.stroke();

    // 九宫格斜线 - 下半（红方）
    ctx.beginPath();
    ctx.moveTo(boardX + 3 * cellW, boardY + 7 * cellH);
    ctx.lineTo(boardX + 5 * cellW, boardY + 9 * cellH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(boardX + 5 * cellW, boardY + 7 * cellH);
    ctx.lineTo(boardX + 3 * cellW, boardY + 9 * cellH);
    ctx.stroke();

    // 楚河汉界文字
    ctx.font = `${cellH * 0.4}px serif`;
    ctx.fillStyle = '#3D2817';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const riverY = boardY + 4.5 * cellH;
    ctx.fillText('楚 河', boardX + 2 * cellW, riverY);
    ctx.fillText('漢 界', boardX + 6 * cellW, riverY);

    // 炮和兵的位置标记（小十字）
    this._drawPositionMark();
  },

  _drawPositionMark: function () {
    const ctx = this._state.ctx;
    const { boardX, boardY, cellW, cellH } = this._state;
    const markSize = cellW * 0.12;

    // 需要标记的位置 (炮位 和 兵位)
    const positions = [
      [2, 1], [2, 7],  // 黑炮
      [7, 1], [7, 7],  // 红炮
      [3, 0], [3, 2], [3, 4], [3, 6], [3, 8],  // 黑卒
      [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]   // 红兵
    ];

    ctx.strokeStyle = '#3D2817';
    ctx.lineWidth = 1;

    for (const [r, c] of positions) {
      const x = boardX + c * cellW;
      const y = boardY + r * cellH;

      // 四角小标记
      const drawCorner = function (offsetX, offsetY) {
        ctx.beginPath();
        ctx.moveTo(x + offsetX * markSize, y + offsetY * markSize);
        ctx.lineTo(x + (offsetX + 1) * markSize, y + offsetY * markSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + offsetX * markSize, y + offsetY * markSize);
        ctx.lineTo(x + offsetX * markSize, y + (offsetY + 1) * markSize);
        ctx.stroke();
      };

      // 四个角落，边缘位置只画朝内的角
      const leftOk = c > 0;
      const rightOk = c < 8;
      if (leftOk) drawCorner(-1, -1);  if (leftOk) drawCorner(-1, 0);
      if (rightOk) drawCorner(1, -1); if (rightOk) drawCorner(1, 0);
    }
  },

  // 绘制所有棋子
  _drawPieces: function () {
    const ctx = this._state.ctx;
    const board = this._state.board;
    const { boardX, boardY, cellW, cellH, pieceRadius } = this._state;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c];
        if (piece !== 0) {
          const x = boardX + c * cellW;
          const y = boardY + r * cellH;
          this._drawPiece(ctx, x, y, piece, pieceRadius);
        }
      }
    }
  },

  // 绘制单个棋子
  _drawPiece: function (ctx, x, y, piece, radius) {
    const side = engine.getSide(piece);
    const name = engine.getPieceName(piece);

    // 棋子阴影
    ctx.beginPath();
    ctx.arc(x + 2, y + 3, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // 棋子主体（米黄底色）
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#F5DEB3';
    ctx.fill();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 内圈
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.82, 0, Math.PI * 2);
    ctx.strokeStyle = side === 1 ? '#CD5C5C' : '#1C1C1C';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 棋子文字
    ctx.font = `bold ${radius * 1.1}px "STKaiti", "KaiTi", serif`;
    ctx.fillStyle = side === 1 ? '#CD5C5C' : '#1C1C1C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x, y + 1);
  },

  // 绘制选中高亮
  _drawSelection: function () {
    const sel = this._state.selected;
    if (!sel) return;

    const ctx = this._state.ctx;
    const { boardX, boardY, cellW, cellH, pieceRadius } = this._state;
    const x = boardX + sel.c * cellW;
    const y = boardY + sel.r * cellH;

    // 选中圈
    ctx.beginPath();
    ctx.arc(x, y, pieceRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 对角标记
    const markLen = 10;
    const corners = [
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    for (const [dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + dx * pieceRadius * 0.95 - dx * markLen, y + dy * pieceRadius * 0.95);
      ctx.lineTo(x + dx * pieceRadius * 0.95, y + dy * pieceRadius * 0.95 - dy * markLen);
      ctx.stroke();
    }
  },

  // 绘制可走位置提示
  _drawHints: function () {
    const hints = this._state.hintMoves;
    if (!hints || hints.length === 0) return;

    const ctx = this._state.ctx;
    const { boardX, boardY, cellW, cellH, pieceRadius } = this._state;

    for (const move of hints) {
      const x = boardX + move.c * cellW;
      const y = boardY + move.r * cellH;

      // 判断是否是吃子位置
      const targetPiece = this._state.board[move.r][move.c];
      if (targetPiece !== 0) {
        // 吃子：画红色圈标记
        ctx.beginPath();
        ctx.arc(x, y, pieceRadius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 3;
        ctx.stroke();
        // 内部小十字
        ctx.beginPath();
        ctx.moveTo(x - 6, y);
        ctx.lineTo(x + 6, y);
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x, y + 6);
        ctx.stroke();
      } else {
        // 空位：画绿色小点
        ctx.beginPath();
        ctx.arc(x, y, cellW * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 139, 34, 0.5)';
        ctx.fill();
      }
    }
  },

  // 将画布坐标转换为棋盘行列
  _canvasToBoard: function (canvasX, canvasY) {
    const { boardX, boardY, cellW, cellH } = this._state;

    // 相对于棋盘原点
    const relX = canvasX - boardX;
    const relY = canvasY - boardY;

    // 判断是否在棋盘范围内
    if (relX < -cellW * 0.5 || relX > 8 * cellW + cellW * 0.5) return null;
    if (relY < -cellH * 0.5 || relY > 9 * cellH + cellH * 0.5) return null;

    const c = Math.round(relX / cellW);
    const r = Math.round(relY / cellH);

    if (r < 0 || r > 9 || c < 0 || c > 8) return null;

    return { r, c };
  },

  // Canvas 点击事件
  onCanvasTap: function (e) {
    if (this.data.aiThinking || this.data.gameOver) return;

    const that = this;
    const touch = e.changedTouches[0];
    if (!touch) return;

    // 使用 createSelectorQuery 获取 canvas 的 boundingClientRect
    wx.createSelectorQuery()
      .select('#chessCanvas')
      .boundingClientRect(function (rect) {
        if (!rect) return;

        // 将 pageX/pageY 转换为 canvas 内部坐标
        const canvasX = touch.pageX - rect.left;
        const canvasY = touch.pageY - rect.top;

        that._handleTap(canvasX, canvasY);
      })
      .exec();
  },

  _handleTap: function (canvasX, canvasY) {
    const pos = this._canvasToBoard(canvasX, canvasY);
    if (!pos) return;

    const { r, c } = pos;
    const board = this._state.board;
    const piece = board[r][c];
    const side = engine.getSide(piece);
    const turnSide = this.data.turnSide;

    // 如果有选中的棋子
    if (this._state.selected) {
      const sel = this._state.selected;
      // 点击同一个棋子 → 取消选中
      if (sel.r === r && sel.c === c) {
        this._state.selected = null;
        this._state.hintMoves = [];
        this._renderAll();
        return;
      }

      // 检查点击位置是否是之前显示的可走位置
      const isValidTarget = this._state.hintMoves.some(h => h.r === r && h.c === c);

      if (isValidTarget) {
        // 执行走子
        this._doMove(sel.r, sel.c, r, c);
        return;
      }

      // 如果点到自己其他棋子 → 切换选中
      if (piece !== 0 && side === turnSide) {
        this._selectPiece(r, c);
        return;
      }

      // 其他情况（空格或对方棋子）→ 取消选中
      this._state.selected = null;
      this._state.hintMoves = [];
      this._renderAll();
    } else {
      // 没有选中，点到自己棋子 → 选中
      if (piece !== 0 && side === turnSide) {
        this._selectPiece(r, c);
      }
    }
  },

  // 选中一个棋子，显示可走位置
  _selectPiece: function (r, c) {
    const moves = engine.getValidMoves(this._state.board, r, c);
    this._state.selected = { r, c };
    this._state.hintMoves = moves.map(m => ({ r: m.to.r, c: m.to.c }));
    this._renderAll();
  },

  // 执行走子
  _doMove: function (fromR, fromC, toR, toC) {
    const board = this._state.board;

    // 保存历史（用于悔棋）
    this._state.history.push({
      board: engine.copyBoard(board),
      turnSide: this.data.turnSide
    });

    // 检查是否吃子（用于提示）
    const captured = board[toR][toC];

    // 执行移动
    board[toR][toC] = board[fromR][fromC];
    board[fromR][fromC] = 0;

    // 清除选中状态
    this._state.selected = null;
    this._state.hintMoves = [];

    // 更新悔棋按钮状态
    this.setData({ undoEnabled: true });

    // 渲染
    this._renderAll();

    // 检查游戏结束
    const nextSide = -this.data.turnSide;

    // 检查是否将死
    if (!engine.findKing(board, nextSide)) {
      this._gameOver(this.data.turnSide);
      return;
    }

    if (engine.isGameOver(board, nextSide)) {
      // 对手无路可走
      this._gameOver(this.data.turnSide);
      return;
    }

    // 吃将提示
    if (captured !== 0 && engine.getSide(captured) === -this.data.turnSide) {
      const capturedName = engine.getPieceName(captured);
      this._showTip('吃 ' + capturedName + '！');
    }

    // 检查将军
    if (engine.isInCheck(board, nextSide)) {
      this._showTip('将军！');
    }

    // 切换回合
    this.setData({ turnSide: nextSide });

    // 如果是 AI 回合，触发 AI
    if (nextSide === -1) {
      this._triggerAI();
    }
  },

  // 触发 AI 走子
  _triggerAI: function () {
    const that = this;
    this.setData({ aiThinking: true });

    // 用 setTimeout 避免阻塞 UI
    setTimeout(function () {
      const move = ai.getAIMove(that._state.board, that.data.difficulty, -1);
      that.setData({ aiThinking: false });

      if (!move) {
        // AI 无法走子
        that._gameOver(1); // 红方胜
        return;
      }

      // 执行 AI 走子
      that._doMove(move.from.r, move.from.c, move.to.r, move.to.c);
    }, 100);
  },

  // 悔棋
  onUndo: function () {
    if (this.data.aiThinking || this.data.gameOver) return;
    if (this._state.history.length === 0) return;

    // 悔棋一步（玩家撤销自己上一步 + AI 上一步）
    // 回退到玩家走子前的状态
    let undoCount = 0;
    if (this.data.turnSide === 1) {
      // AI 刚走过，需要撤销两步
      undoCount = 2;
    } else {
      undoCount = 1;
    }

    for (let i = 0; i < undoCount && this._state.history.length > 0; i++) {
      const last = this._state.history.pop();
      this._state.board = last.board;
      this.setData({ turnSide: last.turnSide });
    }

    this._state.selected = null;
    this._state.hintMoves = [];
    this._renderAll();

    // 重新开启 AI
    this.setData({ aiThinking: false });

    if (this._state.history.length === 0) {
      this.setData({ undoEnabled: false });
    }
  },

  // 重新开始
  onRestart: function () {
    wx.showModal({
      title: '确认重开？',
      content: '当前对局将丢失',
      confirmText: '重开',
      confirmColor: '#CD5C5C',
      success: function (res) {
        if (res.confirm) {
          this._initGame();
        }
      }.bind(this)
    });
  },

  // 退出
  onExit: function () {
    wx.showModal({
      title: '确认退出？',
      content: '当前对局将丢失',
      confirmText: '退出',
      confirmColor: '#CD5C5C',
      success: function (res) {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },

  // 游戏结束
  _gameOver: function (winnerSide) {
    this.setData({
      gameOver: true,
      winner: winnerSide,
      aiThinking: false
    });

    const that = this;
    setTimeout(function () {
      wx.showModal({
        title: winnerSide === 1 ? '🎉 你赢了！' : '😔 你输了',
        content: winnerSide === 1 ? '恭喜击败 AI！' : '再接再厉！',
        confirmText: '再来一局',
        cancelText: '返回首页',
        success: function (res) {
          if (res.confirm) {
            that._initGame();
          } else {
            wx.navigateBack();
          }
        }
      });
    }, 300);
  },

  // 显示短暂提示
  _showTip: function (text) {
    const that = this;
    this.setData({ tipText: text });
    setTimeout(function () {
      that.setData({ tipText: '' });
    }, 2000);
  },

  // 分享
  onShareAppMessage: function () {
    return {
      title: '中国象棋 - 来和 AI 战一局！',
      path: '/pages/home/home'
    };
  }
});
