// 中国象棋 AI - 极小极大 + Alpha-Beta 剪枝
const engine = require('./chess-engine.js');

// 棋子基础价值
const PIECE_VALUES = {
  1: 10000,   // 帅/将
  2: 20,      // 士/仕
  3: 20,      // 象/相
  4: 40,      // 马
  5: 90,      // 车
  6: 45,      // 炮
  7: 10       // 兵/卒
};

// 位置加成 (过河兵/卒价值翻倍等)
function getPositionBonus(piece, row) {
  const type = Math.abs(piece);
  const side = engine.getSide(piece);
  let bonus = 0;

  // 兵/卒过河加成
  if (type === engine.PIECE.PAWN) {
    const crossed = side === 1 ? row <= 4 : row >= 5;
    if (crossed) bonus += 10;
  }

  // 车/马/炮位置加成（越靠近中心越好）
  if (type === engine.PIECE.ROOK || type === engine.PIECE.HORSE || type === engine.PIECE.CANNON) {
    // 车和炮在中心位置更有威胁
    const center = 4;
    // 这个加成在 getStaticEvaluation 中会更详细处理
  }

  return bonus;
}

// 计算局面评分 (正数=红方优, 负数=黑方优)
function evaluateBoard(board) {
  let score = 0;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece === 0) continue;

      const type = Math.abs(piece);
      const side = engine.getSide(piece);
      let value = PIECE_VALUES[type] || 0;

      // 位置加成
      value += getPositionBonus(piece, r);

      // 中心位置加成
      if (type === engine.PIECE.ROOK || type === engine.PIECE.HORSE || type === engine.PIECE.CANNON) {
        const distFromCenter = Math.abs(c - 4);
        value += (4 - distFromCenter);
      }

      if (side === 1) {
        score += value;
      } else {
        score -= value;
      }
    }
  }

  // 将军加分
  if (engine.isInCheck(board, -1)) score += 50;
  if (engine.isInCheck(board, 1)) score -= 50;

  return score;
}

// 排序走法 - 优先吃子、将军
function orderMoves(board, moves) {
  return moves.sort((a, b) => {
    const targetA = board[a.to.r][a.to.c];
    const targetB = board[b.to.r][b.to.c];
    // 吃子优先
    if (targetA !== 0 && targetB === 0) return -1;
    if (targetA === 0 && targetB !== 0) return 1;
    // 吃贵子优先
    if (targetA !== 0 && targetB !== 0) {
      const valA = PIECE_VALUES[Math.abs(targetA)] || 0;
      const valB = PIECE_VALUES[Math.abs(targetB)] || 0;
      return valB - valA;
    }
    return 0;
  });
}

// 极小极大 + Alpha-Beta 剪枝
function minimax(board, depth, alpha, beta, isMaximizing, aiSide) {
  const humanSide = -aiSide;
  const currentSide = isMaximizing ? aiSide : humanSide;

  // 深度到达或游戏结束
  const kingPos = engine.findKing(board, currentSide);
  if (!kingPos) {
    // 当前方将/帅已失
    return isMaximizing ? -100000 : 100000;
  }

  if (depth === 0) {
    const score = evaluateBoard(board);
    // 红方正数, 黑方负数
    // 如果 AI 是黑方, 需要反转
    return aiSide === 1 ? score : -score;
  }

  const moves = engine.getAllValidMoves(board, currentSide);

  if (moves.length === 0) {
    // 当前方无路可走
    return isMaximizing ? -100000 : 100000;
  }

  // 优化: 排序走法让更可能好的走法先被搜索
  const orderedMoves = orderMoves(board, moves);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of orderedMoves) {
      const newBoard = engine.makeMove(board, move);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiSide);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of orderedMoves) {
      const newBoard = engine.makeMove(board, move);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, aiSide);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// AI 选走 - 返回最佳走法
function getAIMove(board, difficulty = 'normal', aiSide = -1) {
  // 难度对应的搜索深度
  const depthMap = {
    'easy': 2,
    'normal': 3,
    'hard': 4
  };
  const depth = depthMap[difficulty] || 3;

  const allMoves = engine.getAllValidMoves(board, aiSide);
  if (allMoves.length === 0) return null;

  // 只走一步时，随机选一个
  if (allMoves.length === 1) return allMoves[0];

  const orderedMoves = orderMoves(board, allMoves);

  let bestMove = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of orderedMoves) {
    const newBoard = engine.makeMove(board, move);
    // 检查是否直接获胜（吃将/帅）
    if (!engine.findKing(newBoard, -aiSide)) {
      return move; // 直接吃将是最佳走法
    }

    const score = minimax(newBoard, depth - 1, alpha, beta, false, aiSide);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  // 防止困难模式总是同一步，加一点随机性
  if (difficulty === 'hard' && bestMove) {
    if (Math.random() < 0.1) {
      // 10% 概率选择分数前3的走法之一
      const topMoves = orderedMoves.slice(0, Math.min(3, orderedMoves.length));
      return topMoves[Math.floor(Math.random() * topMoves.length)];
    }
  }

  // 简单模式有更多随机性
  if (difficulty === 'easy' && orderedMoves.length > 3) {
    if (Math.random() < 0.5) {
      return orderedMoves[Math.floor(Math.random() * Math.min(5, orderedMoves.length))];
    }
  }

  return bestMove;
}

module.exports = {
  getAIMove,
  evaluateBoard,
  PIECE_VALUES
};
