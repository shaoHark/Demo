// 象棋规则引擎
// 棋盘坐标系: 9列(0-8) x 10行(0-9)
// 行 0-4 是黑方半场, 行 5-9 是红方半场
// 棋子编码: 正数=红方, 负数=黑方
// 1=帅/将, 2=仕/士, 3=相/象, 4=马, 5=车, 6=炮, 7=兵/卒

const PIECE = {
  KING: 1,    // 帅/将
  ADVISOR: 2, // 仕/士
  ELEPHANT: 3,// 相/象
  HORSE: 4,   // 马
  ROOK: 5,    // 车
  CANNON: 6,  // 炮
  PAWN: 7     // 兵/卒
};

const PIECE_NAMES = {
  '1': '帅', '-1': '将',
  '2': '仕', '-2': '士',
  '3': '相', '-3': '象',
  '4': '马', '-4': '马',
  '5': '车', '-5': '车',
  '6': '炮', '-6': '炮',
  '7': '兵', '-7': '卒'
};

// 创建初始棋盘
function createInitialBoard() {
  const board = [];
  for (let r = 0; r < 10; r++) {
    board[r] = [];
    for (let c = 0; c < 9; c++) {
      board[r][c] = 0;
    }
  }
  // 黑方 (行 0-4)
  board[0][0] = -5; board[0][8] = -5; // 车
  board[0][1] = -4; board[0][7] = -4; // 马
  board[0][2] = -3; board[0][6] = -3; // 象
  board[0][3] = -2; board[0][5] = -2; // 士
  board[0][4] = -1;                    // 将
  board[2][1] = -6; board[2][7] = -6; // 炮
  board[3][0] = -7; board[3][2] = -7; board[3][4] = -7; board[3][6] = -7; board[3][8] = -7; // 卒

  // 红方 (行 5-9)
  board[9][0] = 5; board[9][8] = 5;   // 车
  board[9][1] = 4; board[9][7] = 4;   // 马
  board[9][2] = 3; board[9][6] = 3;   // 相
  board[9][3] = 2; board[9][5] = 2;   // 仕
  board[9][4] = 1;                     // 帅
  board[7][1] = 6; board[7][7] = 6;   // 炮
  board[6][0] = 7; board[6][2] = 7; board[6][4] = 7; board[6][6] = 7; board[6][8] = 7; // 兵

  return board;
}

// 深拷贝棋盘
function copyBoard(board) {
  return board.map(row => row.slice());
}

// 判断坐标是否在棋盘内
function inBoard(row, col) {
  return row >= 0 && row < 10 && col >= 0 && col < 9;
}

// 判断棋子在哪个阵营 (1=红, -1=黑)
function getSide(piece) {
  if (piece > 0) return 1;
  if (piece < 0) return -1;
  return 0;
}

// 判断是否在九宫格内
function inPalace(row, col, side) {
  if (col < 3 || col > 5) return false;
  if (side === 1) return row >= 7 && row <= 9;   // 红方九宫
  if (side === -1) return row >= 0 && row <= 2;  // 黑方九宫
  return false;
}

// 判断是否过河
function hasCrossedRiver(row, side) {
  if (side === 1) return row <= 4;   // 红兵过河
  if (side === -1) return row >= 5;  // 黑卒过河
  return false;
}

// 获取某棋子的所有合法走法 (返回 [{from:{r,c}, to:{r,c}}])
function getValidMoves(board, row, col) {
  const piece = board[row][col];
  if (piece === 0) return [];

  const side = getSide(piece);
  const type = Math.abs(piece);
  const moves = [];

  switch (type) {
    case PIECE.KING: // 将/帅
      moves.push(...getKingMoves(board, row, col, side));
      break;
    case PIECE.ADVISOR: // 士/仕
      moves.push(...getAdvisorMoves(board, row, col, side));
      break;
    case PIECE.ELEPHANT: // 象/相
      moves.push(...getElephantMoves(board, row, col, side));
      break;
    case PIECE.HORSE: // 马
      moves.push(...getHorseMoves(board, row, col, side));
      break;
    case PIECE.ROOK: // 车
      moves.push(...getRookMoves(board, row, col, side));
      break;
    case PIECE.CANNON: // 炮
      moves.push(...getCannonMoves(board, row, col, side));
      break;
    case PIECE.PAWN: // 兵/卒
      moves.push(...getPawnMoves(board, row, col, side));
      break;
  }

  // 过滤掉走后被将军的情况
  return moves.filter(move => {
    const newBoard = makeMove(board, move);
    return !isInCheck(newBoard, side);
  });
}

function getKingMoves(board, row, col, side) {
  const moves = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of directions) {
    const nr = row + dr, nc = col + dc;
    if (inPalace(nr, nc, side) && getSide(board[nr][nc]) !== side) {
      moves.push({ from: { r: row, c: col }, to: { r: nr, c: nc } });
    }
  }
  return moves;
}

function getAdvisorMoves(board, row, col, side) {
  const moves = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of directions) {
    const nr = row + dr, nc = col + dc;
    if (inPalace(nr, nc, side) && getSide(board[nr][nc]) !== side) {
      moves.push({ from: { r: row, c: col }, to: { r: nr, c: nc } });
    }
  }
  return moves;
}

function getElephantMoves(board, row, col, side) {
  const moves = [];
  const directions = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
  for (const [dr, dc] of directions) {
    const nr = row + dr, nc = col + dc;
    const er = row + dr / 2, ec = col + dc / 2; // 象眼
    // 象不能过河
    if (side === 1 && nr < 5) continue;
    if (side === -1 && nr > 4) continue;
    // 象眼不能被堵
    if (!inBoard(nr, nc) || board[er][ec] !== 0) continue;
    // 目标格不能有己方棋子
    if (getSide(board[nr][nc]) !== side) {
      moves.push({ from: { r: row, c: col }, to: { r: nr, c: nc } });
    }
  }
  return moves;
}

function getHorseMoves(board, row, col, side) {
  const moves = [];
  // 8种跳法: [目标行偏移, 目标列偏移, 马腿位置行偏移, 马腿位置列偏移]
  const jumps = [
    [-2, -1, -1, 0], [-2, 1, -1, 0],
    [2, -1, 1, 0], [2, 1, 1, 0],
    [-1, -2, 0, -1], [1, -2, 0, -1],
    [-1, 2, 0, 1], [1, 2, 0, 1]
  ];
  for (const [dr, dc, lr, lc] of jumps) {
    const nr = row + dr, nc = col + dc;
    const legR = row + lr, legC = col + lc;
    if (!inBoard(nr, nc)) continue;
    // 马腿不能被堵
    if (board[legR][legC] !== 0) continue;
    if (getSide(board[nr][nc]) !== side) {
      moves.push({ from: { r: row, c: col }, to: { r: nr, c: nc } });
    }
  }
  return moves;
}

function getRookMoves(board, row, col, side) {
  const moves = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of directions) {
    let nr = row + dr, nc = col + dc;
    while (inBoard(nr, nc)) {
      if (board[nr][nc] === 0) {
        moves.push({ from: { r: row, c: col }, to: { r: nr, c: nc } });
      } else {
        if (getSide(board[nr][nc]) !== side) {
          moves.push({ from: { r: row, c: col }, to: { r: nr, c: nc } });
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

function getCannonMoves(board, row, col, side) {
  const moves = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of directions) {
    let nr = row + dr, nc = col + dc;
    // 移动阶段: 找第一个炮架
    let foundPlatform = false;
    while (inBoard(nr, nc)) {
      if (!foundPlatform) {
        if (board[nr][nc] === 0) {
          moves.push({ from: { r: row, c: col }, to: { r: nr, c: nc } });
        } else {
          foundPlatform = true; // 遇到炮架
        }
      } else {
        // 跳过后找可吃的棋子
        if (board[nr][nc] !== 0) {
          if (getSide(board[nr][nc]) !== side) {
            moves.push({ from: { r: row, c: col }, to: { r: nr, c: nc } });
          }
          break;
        }
      }
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

function getPawnMoves(board, row, col, side) {
  const moves = [];
  // 向前走
  const forward = side === 1 ? -1 : 1; // 红方兵向上，黑方卒向下
  const nr = row + forward;
  if (inBoard(nr, col) && getSide(board[nr][col]) !== side) {
    moves.push({ from: { r: row, c: col }, to: { r: nr, c: col } });
  }
  // 过河后可以左右走
  if (hasCrossedRiver(row, side)) {
    const left = col - 1;
    const right = col + 1;
    if (inBoard(row, left) && getSide(board[row][left]) !== side) {
      moves.push({ from: { r: row, c: col }, to: { r: row, c: left } });
    }
    if (inBoard(row, right) && getSide(board[row][right]) !== side) {
      moves.push({ from: { r: row, c: col }, to: { r: row, c: right } });
    }
  }
  return moves;
}

// 执行走子，返回新棋盘
function makeMove(board, move) {
  const newBoard = copyBoard(board);
  newBoard[move.to.r][move.to.c] = newBoard[move.from.r][move.from.c];
  newBoard[move.from.r][move.from.c] = 0;
  return newBoard;
}

// 获取某方所有合法走法
function getAllValidMoves(board, side) {
  const allMoves = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (getSide(board[r][c]) === side) {
        const moves = getValidMoves(board, r, c);
        allMoves.push(...moves);
      }
    }
  }
  return allMoves;
}

// 查找将/帅的位置
function findKing(board, side) {
  const kingPiece = side * PIECE.KING;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === kingPiece) {
        return { r, c };
      }
    }
  }
  return null;
}

// 判断两方将/帅是否对脸
function kingsFacing(board) {
  const redKing = findKing(board, 1);
  const blackKing = findKing(board, -1);
  if (!redKing || !blackKing) return false;
  if (redKing.c !== blackKing.c) return false;
  // 检查两将之间是否有棋子
  const minRow = Math.min(redKing.r, blackKing.r);
  const maxRow = Math.max(redKing.r, blackKing.r);
  for (let r = minRow + 1; r < maxRow; r++) {
    if (board[r][redKing.c] !== 0) return false;
  }
  return true;
}

// 判断某方是否被将军
function isInCheck(board, side) {
  // 首先检查对脸
  if (kingsFacing(board)) return true;

  const kingPos = findKing(board, side);
  if (!kingPos) return true; // 将/帅被吃了

  // 检查对方所有棋子能否攻击到将/帅
  const opponent = -side;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (getSide(board[r][c]) === opponent) {
        const moves = getValidMovesNoCheck(board, r, c);
        for (const move of moves) {
          if (move.to.r === kingPos.r && move.to.c === kingPos.c) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// 不检查将军的合法走法（用于 isInCheck 内部）
function getValidMovesNoCheck(board, row, col) {
  const piece = board[row][col];
  if (piece === 0) return [];
  const side = getSide(piece);
  const type = Math.abs(piece);
  const moves = [];

  switch (type) {
    case PIECE.KING:
      moves.push(...getKingMoves(board, row, col, side));
      break;
    case PIECE.ADVISOR:
      moves.push(...getAdvisorMoves(board, row, col, side));
      break;
    case PIECE.ELEPHANT:
      moves.push(...getElephantMoves(board, row, col, side));
      break;
    case PIECE.HORSE:
      moves.push(...getHorseMoves(board, row, col, side));
      break;
    case PIECE.ROOK:
      moves.push(...getRookMoves(board, row, col, side));
      break;
    case PIECE.CANNON:
      moves.push(...getCannonMoves(board, row, col, side));
      break;
    case PIECE.PAWN:
      moves.push(...getPawnMoves(board, row, col, side));
      break;
  }
  return moves;
}

// 判断某方是否走投无路（绝杀或困毙）
function isGameOver(board, side) {
  const allMoves = getAllValidMoves(board, side);
  return allMoves.length === 0;
}

// 获取棋子名称
function getPieceName(piece) {
  return PIECE_NAMES[String(piece)] || '';
}

module.exports = {
  PIECE,
  PIECE_NAMES,
  createInitialBoard,
  copyBoard,
  getValidMoves,
  getAllValidMoves,
  makeMove,
  isInCheck,
  isGameOver,
  findKing,
  kingsFacing,
  getSide,
  getPieceName
};
