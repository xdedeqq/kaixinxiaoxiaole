import CellModel from "./CellModel";
import { mergePointArray, exclusivePoint } from "../Utils/ModelUtils"
import { CELL_TYPE, CELL_BASENUM, CELL_STATUS, GRID_WIDTH, GRID_HEIGHT, ANITIME } from "./ConstValue";

export default class GameModel {
  /**
   * 这是一个类的构造函数 constructor，它用于初始化类的属性，为游戏网格和方块的状态管理做准备。
   */
  constructor() {
    this.cells = null; // 用于存储游戏网格中的所有方块（CellModel）的二维数组
    this.cellBgs = null; // 用于存储网格背景的二维数组，可能用于渲染背景
    this.lastPos = cc.v2(-1, -1); // 记录上一次点击的格子位置，初始化为无效位置 (-1, -1)
    this.cellTypeNum = 5; // 方块的类型数量，默认值为 5
    this.cellCreateType = []; // 用于生成方块类型的数组，方块类型将在此数组中查找
  }


  /**
   * 这个函数 init 用于初始化游戏网格中的方块，确保每个方块被正确地创建并且不会在初始化时出现立即可消除的组合。它通过随机生成方块类型并进行检测，避免在初始布局中产生可消除的方块组合。
   * @param {*} cellTypeNum 
   */
  init(cellTypeNum) {
    this.cells = []; // 初始化 cells 数组，用于存储整个网格中的方块
    this.setCellTypeNum(cellTypeNum || this.cellTypeNum); // 设置方块类型的数量

    // 创建网格，并在每个网格位置创建一个新的 CellModel 实例
    for (var i = 1; i <= GRID_WIDTH; i++) {
        this.cells[i] = []; // 初始化每一行的数组
        for (var j = 1; j <= GRID_HEIGHT; j++) {
            this.cells[i][j] = new CellModel(); // 在每个网格位置创建一个新的 CellModel 对象
        }
    }

    // this.mock(); // 用于测试的 mock 数据（如果需要测试，可以取消注释）

    // 为网格中的每个位置设置方块的类型
    for (var i = 1; i <= GRID_WIDTH; i++) {
        for (var j = 1; j <= GRID_HEIGHT; j++) {
            // 如果该位置的方块类型已经通过 mock 数据生成，则跳过
            if (this.cells[i][j].type != null) {
                continue;
            }
            
            let flag = true; // 标志变量，用于控制循环
            while (flag) {
                flag = false; // 重置标志变量

                // 初始化该位置的方块，随机设置类型
                this.cells[i][j].init(this.getRandomCellType());

                // 检查该位置的方块是否会导致消除
                let result = this.checkPoint(j, i)[0];
                if (result.length > 2) { // 如果有可消除的方块组合
                    flag = true; // 设置标志变量，重新生成类型
                }

                // 设置方块的当前位置和起始位置
                this.cells[i][j].setXY(j, i);
                this.cells[i][j].setStartXY(j, i);
            }
        }
    }
  }


  mock() {
    this.mockInit(5, 1, CELL_TYPE.A);
    this.mockInit(5, 3, CELL_TYPE.A);
    this.mockInit(4, 2, CELL_TYPE.A);
    this.mockInit(3, 2, CELL_TYPE.A);
    this.mockInit(5, 2, CELL_TYPE.B);
    this.mockInit(6, 2, CELL_TYPE.B);
    this.mockInit(7, 3, CELL_TYPE.B);
    this.mockInit(8, 2, CELL_TYPE.A);
  }
  mockInit(x, y, type) {
    this.cells[x][y].init(type)
    this.cells[x][y].setXY(y, x);
    this.cells[x][y].setStartXY(y, x);
  }


  initWithData(data) {
    // to do
  }

  /**
   * 这个函数 checkPoint 用于检查在指定位置（x, y）是否可以形成一个消除组合，并确定新的方块状态。它会根据行和列方向上的相同类型方块数量，确定是否形成特殊方块（如鸟、包裹、横线、纵线等）。如果 recursive 参数为 true，还会递归检查周围的方块是否可以形成更大的消除范围。
   * @param x - 检查的起始位置 x 坐标
   * @param y - 检查的起始位置 y 坐标
   * @param recursive - 是否递归查找
   * @returns {([]|string|*)[]} - 返回一个数组，包含消除点、新状态、类型和起始位置
   */
  checkPoint(x, y, recursive) {
    // 检查水平方向（左右）的相同类型方块
    let rowResult = this.checkWithDirection(x, y, [cc.v2(1, 0), cc.v2(-1, 0)]);
    // 检查垂直方向（上下）的相同类型方块
    let colResult = this.checkWithDirection(x, y, [cc.v2(0, -1), cc.v2(0, 1)]);
    
    let samePoints = []; // 存储相同类型的方块
    let newCellStatus = ""; // 新的方块状态
    
    // 根据找到的相同类型方块数量确定新的方块状态
    if (rowResult.length >= 5 || colResult.length >= 5) {
        newCellStatus = CELL_STATUS.BIRD; // 如果行或列有 5 个或更多相同类型的方块，生成 BIRD
    } else if (rowResult.length >= 3 && colResult.length >= 3) {
        newCellStatus = CELL_STATUS.WRAP; // 如果行和列各有 3 个或更多相同类型的方块，生成 WRAP
    } else if (rowResult.length >= 4) {
        newCellStatus = CELL_STATUS.LINE; // 如果行有 4 个或更多相同类型的方块，生成 LINE
    } else if (colResult.length >= 4) {
        newCellStatus = CELL_STATUS.COLUMN; // 如果列有 4 个或更多相同类型的方块，生成 COLUMN
    }

    // 如果水平方向有 3 个或更多相同类型的方块，加入到 samePoints
    if (rowResult.length >= 3) {
        samePoints = rowResult;
    }

    // 如果垂直方向有 3 个或更多相同类型的方块，合并到 samePoints
    if (colResult.length >= 3) {
        samePoints = mergePointArray(samePoints, colResult);
    }

    // 构建结果数组，包含相同点列表、新状态、类型和起始位置
    let result = [samePoints, newCellStatus, this.cells[y][x].type, cc.v2(x, y)];

    // 如果需要递归检查更大范围的消除
    if (recursive && result.length >= 3) {
        // 从相同点列表中排除当前点，得到子检查点
        let subCheckPoints = exclusivePoint(samePoints, cc.v2(x, y));
        for (let point of subCheckPoints) {
            // 检查子点的消除结果
            let subResult = this.checkPoint(point.x, point.y, false);
            // 如果子点的消除结果更好，更新结果
            if (subResult[1] > result[1] || (subResult[1] === result[1] && subResult[0].length > result[0].length)) {
                result = subResult;
            }
        }
    }

    // 返回最终的结果
    return result;
  }


  /**
   * 这是一个用于检查网格中相邻相同类型方块的函数 checkWithDirection。它使用广度优先搜索（BFS）来查找指定方向上与目标方块相连的所有相同类型的方块。
   * @param {*} x 
   * @param {*} y 
   * @param {*} direction 
   * @returns 
   */
  // 检查指定方向上相同类型的方块
  checkWithDirection(x, y, direction) {
    let queue = []; // 用于存储需要检查的方块
    let vis = []; // 用于记录已访问的方块，防止重复检查

    // 将初始点标记为已访问
    vis[x + y * 9] = true;
    queue.push(cc.v2(x, y)); // 将初始点加入队列

    let front = 0; // 队列的前端索引
    // 使用广度优先搜索 (BFS) 查找相邻的相同类型方块
    while (front < queue.length) {
        // 取出队列的第一个点
        let point = queue[front];
        let cellModel = this.cells[point.y][point.x]; // 获取当前点的方块模型
        front++; // 移动队列的前端索引

        // 如果当前点没有方块，跳过
        if (!cellModel) {
            continue;
        }

        // 遍历所有方向
        for (let i = 0; i < direction.length; i++) {
            // 计算相邻位置的坐标
            let tmpX = point.x + direction[i].x;
            let tmpY = point.y + direction[i].y;

            // 检查边界条件和是否已访问过
            if (tmpX < 1 || tmpX > 9 || tmpY < 1 || tmpY > 9
                || vis[tmpX + tmpY * 9]
                || !this.cells[tmpY][tmpX]) {
                continue; // 如果超出边界、已访问过或为空格子，则跳过
            }

            // 如果相邻的方块类型与当前方块相同
            if (cellModel.type === this.cells[tmpY][tmpX].type) {
                vis[tmpX + tmpY * 9] = true; // 标记该点为已访问
                queue.push(cc.v2(tmpX, tmpY)); // 将相邻点加入队列
            }
        }
    }

    // 返回相连的所有相同类型方块的列表
    return queue;
  }


  printInfo() {
    for (var i = 1; i <= 9; i++) {
      var printStr = "";
      for (var j = 1; j <= 9; j++) {
        printStr += this.cells[i][j].type + " ";
      }
      console.log(printStr);
    }
  }

  getCells() {
    return this.cells;
  }
  // controller调用的主要入口
  // 点击某个格子
  selectCell(pos) {
    this.changeModels = []; // 存储发生改变的模型，将作为返回值，提供给视图播放动画
    this.effectsQueue = []; // 特效队列，用于存储消失、爆炸等效果

    var lastPos = this.lastPos; // 上次点击的格子位置
    var delta = Math.abs(pos.x - lastPos.x) + Math.abs(pos.y - lastPos.y); // 计算当前点击的格子和上次点击的格子的距离

    // 如果两个格子不相邻，直接返回
    if (delta != 1) {
        this.lastPos = pos; // 更新上次点击的格子位置为当前格子
        return [[], []]; // 返回空数组
    }

    let curClickCell = this.cells[pos.y][pos.x]; // 获取当前点击的格子
    let lastClickCell = this.cells[lastPos.y][lastPos.x]; // 获取上次点击的格子

    // 交换两个格子的状态
    this.exchangeCell(lastPos, pos);

    // 检查交换后的两个格子是否可以形成消除
    var result1 = this.checkPoint(pos.x, pos.y)[0]; // 当前格子的消除结果
    var result2 = this.checkPoint(lastPos.x, lastPos.y)[0]; // 上一次点击格子的消除结果

    this.curTime = 0; // 初始化动画播放的当前时间

    // 将当前点击和上次点击的格子加入变化模型数组
    this.pushToChangeModels(curClickCell);
    this.pushToChangeModels(lastClickCell);

    // 检查是否有特殊方块参与
    let isCanBomb = (curClickCell.status != CELL_STATUS.COMMON && // 当前格子和上次点击的格子是否为特殊方块
        lastClickCell.status != CELL_STATUS.COMMON) ||
        curClickCell.status == CELL_STATUS.BIRD ||
        lastClickCell.status == CELL_STATUS.BIRD;

    // 如果两个格子都不能形成消除，且没有特殊方块
    if (result1.length < 3 && result2.length < 3 && !isCanBomb) {
        // 将格子状态还原
        this.exchangeCell(lastPos, pos);
        curClickCell.moveToAndBack(lastPos); // 移动并还原
        lastClickCell.moveToAndBack(pos); // 移动并还原
        this.lastPos = cc.v2(-1, -1); // 重置上次点击的位置
        return [this.changeModels]; // 返回发生变化的模型数组
    } else {
        // 可以形成消除的情况
        this.lastPos = cc.v2(-1, -1); // 重置上次点击的位置
        curClickCell.moveTo(lastPos, this.curTime); // 将当前点击格子移动到上次点击的位置
        lastClickCell.moveTo(pos, this.curTime); // 将上次点击格子移动到当前点击的位置
        var checkPoint = [pos, lastPos]; // 构建检查点列表
        this.curTime += ANITIME.TOUCH_MOVE; // 增加动画时间
        this.processCrush(checkPoint); // 处理消除逻辑
        return [this.changeModels, this.effectsQueue]; // 返回发生变化的模型和特效队列
    }
  }

  // 消除
  processCrush(checkPoint) {
    let cycleCount = 0; // 循环次数，用于追踪消除的回合数
    while (checkPoint.length > 0) { // 当有需要检查的消除点时继续循环
        let bombModels = []; // 用于存储需要爆炸的特殊模型
        if (cycleCount == 0 && checkPoint.length == 2) { // 如果是第一次循环且有两个消除点，处理特殊消除逻辑
            let pos1 = checkPoint[0]; // 第一个消除点的位置
            let pos2 = checkPoint[1]; // 第二个消除点的位置
            let model1 = this.cells[pos1.y][pos1.x]; // 获取第一个消除点的模型
            let model2 = this.cells[pos2.y][pos2.x]; // 获取第二个消除点的模型
            // 检查是否有一个方块是“鸟”状态
            if (model1.status == CELL_STATUS.BIRD || model2.status == CELL_STATUS.BIRD) {
                let bombModel = null;
                if (model1.status == CELL_STATUS.BIRD) { // 如果第一个模型是“鸟”
                    model1.type = model2.type; // 将“鸟”的类型设置为第二个模型的类型
                    bombModels.push(model1); // 将第一个模型加入爆炸列表
                }
                else { // 如果第二个模型是“鸟”
                    model2.type = model1.type; // 将“鸟”的类型设置为第一个模型的类型
                    bombModels.push(model2); // 将第二个模型加入爆炸列表
                }
            }
        }

        // 遍历所有的检查点，执行消除逻辑
        for (var i in checkPoint) {
            var pos = checkPoint[i]; // 获取当前消除点的位置
            if (!this.cells[pos.y][pos.x]) { // 检查该位置是否存在方块
                continue; // 如果不存在，跳过该点
            }
            // 检查当前点的周围是否有可消除的方块
            // 返回值包括：可消除的方块数组，新的方块状态，新的方块类型，以及消除点
            var [result, newCellStatus, newCellType, crushPoint] = this.checkPoint(pos.x, pos.y, true);

            if (result.length < 3) { // 如果没有找到至少3个可消除的方块
                continue; // 跳过该点
            }
            // 遍历所有找到的可消除方块
            for (var j in result) {
                var model = this.cells[result[j].y][result[j].x]; // 获取当前要消除的方块模型
                this.crushCell(result[j].x, result[j].y, false, cycleCount); // 消除方块
                if (model.status != CELL_STATUS.COMMON) { // 如果方块不是普通方块
                    bombModels.push(model); // 将特殊方块加入爆炸列表
                }
            }
            // 根据消除点创建新的方块
            this.createNewCell(crushPoint, newCellStatus, newCellType);
        }
        // 处理所有需要爆炸的特殊方块
        this.processBomb(bombModels, cycleCount);
        // 增加当前时间，用于动画播放
        this.curTime += ANITIME.DIE;
        // 触发下落操作，获取新的需要检查的消除点
        checkPoint = this.down();
        // 增加循环次数
        cycleCount++;
    }
  }


  // 生成新 cell
  createNewCell(pos, status, type) {
    // 如果状态为空字符串，则不创建新的方块
    if (status == "") {
        return;
    }

    // 如果状态是 BIRD，则将类型设置为 BIRD
    if (status == CELL_STATUS.BIRD) {
        type = CELL_TYPE.BIRD;
    }

    // 创建一个新的 CellModel 实例
    let model = new CellModel();

    // 将新的模型放置到指定的位置
    this.cells[pos.y][pos.x] = model;

    // 初始化模型的类型
    model.init(type);

    // 设置模型的起始位置
    model.setStartXY(pos.x, pos.y);

    // 设置模型的当前位置
    model.setXY(pos.x, pos.y);

    // 设置模型的状态
    model.setStatus(status);

    // 设置模型的可见性
    // 立即设置为不可见
    model.setVisible(0, false);
    // 在当前时间点设置为可见，加入动画时间线
    model.setVisible(this.curTime, true);

    // 将新的模型加入变化模型数组，用于后续处理
    this.changeModels.push(model);
  }

  
  // 下落
  down() {
    let newCheckPoint = []; // 用于存储新的检查点，在方块下落后需要再次检查消除
    // 遍历每一列
    for (var i = 1; i <= GRID_WIDTH; i++) {
        // 遍历每一行
        for (var j = 1; j <= GRID_HEIGHT; j++) {
            // 如果当前方块为空（需要被填补）
            if (this.cells[i][j] == null) {
                var curRow = i; // 记录当前行位置
                // 从当前行往下遍历，寻找非空方块
                for (var k = curRow; k <= GRID_HEIGHT; k++) {
                    // 如果找到非空方块
                    if (this.cells[k][j]) {
                        // 将该方块加入变化模型数组，表示需要进行动画
                        this.pushToChangeModels(this.cells[k][j]);
                        // 将该方块加入新的检查点列表，以便后续检查
                        newCheckPoint.push(this.cells[k][j]);
                        // 将找到的方块移动到当前空缺位置
                        this.cells[curRow][j] = this.cells[k][j];
                        // 清空原来的位置
                        this.cells[k][j] = null;
                        // 更新方块的坐标
                        this.cells[curRow][j].setXY(j, curRow);
                        // 移动方块到新的位置，添加移动动画
                        this.cells[curRow][j].moveTo(cc.v2(j, curRow), this.curTime);
                        // 移动到下一行位置
                        curRow++;
                    }
                }

                // 在顶部生成新的方块，填补下落后顶部的空缺
                var count = 1; // 用于计算新方块的起始位置
                for (var k = curRow; k <= GRID_HEIGHT; k++) {
                    // 创建新的方块模型
                    this.cells[k][j] = new CellModel();
                    // 初始化方块类型，通常是随机的
                    this.cells[k][j].init(this.getRandomCellType());
                    // 设置新方块的起始位置在网格顶部之外，准备下落
                    this.cells[k][j].setStartXY(j, count + GRID_HEIGHT);
                    // 设置方块当前位置
                    this.cells[k][j].setXY(j, count + GRID_HEIGHT);
                    // 使新方块移动到目标位置
                    this.cells[k][j].moveTo(cc.v2(j, k), this.curTime);
                    count++;
                    // 将新的方块加入变化模型数组
                    this.changeModels.push(this.cells[k][j]);
                    // 将新的方块加入新的检查点列表
                    newCheckPoint.push(this.cells[k][j]);
                }
            }
        }
    }
    // 更新当前时间，用于动画时间线
    this.curTime += ANITIME.TOUCH_MOVE + 0.3;
    // 返回新的检查点列表
    return newCheckPoint;
  }


  pushToChangeModels(model) {
    if (this.changeModels.indexOf(model) != -1) {
      return;
    }
    this.changeModels.push(model);
  }

  cleanCmd() {
    for (var i = 1; i <= GRID_WIDTH; i++) {
      for (var j = 1; j <= GRID_HEIGHT; j++) {
        if (this.cells[i][j]) {
          this.cells[i][j].cmd = [];
        }
      }
    }
  }

  exchangeCell(pos1, pos2) {
    var tmpModel = this.cells[pos1.y][pos1.x];
    this.cells[pos1.y][pos1.x] = this.cells[pos2.y][pos2.x];
    this.cells[pos1.y][pos1.x].x = pos1.x;
    this.cells[pos1.y][pos1.x].y = pos1.y;
    this.cells[pos2.y][pos2.x] = tmpModel;
    this.cells[pos2.y][pos2.x].x = pos2.x;
    this.cells[pos2.y][pos2.x].y = pos2.y;
  }
  // 设置种类
  // Todo 改成乱序算法
  setCellTypeNum(num) {
    console.log("num = ", num);
    this.cellTypeNum = num;
    this.cellCreateType = [];
    let createTypeList = this.cellCreateType;
    for (let i = 1; i <= CELL_BASENUM; i++) {
      createTypeList.push(i);
    }
    for (let i = 0; i < createTypeList.length; i++) {
      let index = Math.floor(Math.random() * (CELL_BASENUM - i)) + i;
      createTypeList[i], createTypeList[index] = createTypeList[index], createTypeList[i]
    }
  }
  // 随机生成一个类型
  getRandomCellType() {
    var index = Math.floor(Math.random() * this.cellTypeNum);
    return this.cellCreateType[index];
  }// 处理炸弹消除效果
  processBomb(bombModels, cycleCount) {
    // 当 bombModels 列表中还有炸弹模型时，持续处理
    while (bombModels.length > 0) {
        let newBombModel = []; // 用于存储新产生的炸弹模型
        let bombTime = ANITIME.BOMB_DELAY; // 炸弹动画延迟时间

        // 遍历当前炸弹模型列表
        bombModels.forEach(function (model) {
            // 处理横向炸弹
            if (model.status == CELL_STATUS.LINE) {
                // 遍历该行的所有方块
                for (let i = 1; i <= GRID_WIDTH; i++) {
                    if (this.cells[model.y][i]) {
                        // 如果是特殊方块，将其加入新的炸弹模型列表
                        if (this.cells[model.y][i].status != CELL_STATUS.COMMON) {
                            newBombModel.push(this.cells[model.y][i]);
                        }
                        // 消除该方块
                        this.crushCell(i, model.y, false, cycleCount);
                    }
                }
                // 添加横向炸弹的动画效果
                this.addRowBomb(this.curTime, cc.v2(model.x, model.y));
            }
            // 处理纵向炸弹
            else if (model.status == CELL_STATUS.COLUMN) {
                // 遍历该列的所有方块
                for (let i = 1; i <= GRID_HEIGHT; i++) {
                    if (this.cells[i][model.x]) {
                        // 如果是特殊方块，将其加入新的炸弹模型列表
                        if (this.cells[i][model.x].status != CELL_STATUS.COMMON) {
                            newBombModel.push(this.cells[i][model.x]);
                        }
                        // 消除该方块
                        this.crushCell(model.x, i, false, cycleCount);
                    }
                }
                // 添加纵向炸弹的动画效果
                this.addColBomb(this.curTime, cc.v2(model.x, model.y));
            }
            // 处理包裹炸弹
            else if (model.status == CELL_STATUS.WRAP) {
                let x = model.x;
                let y = model.y;
                // 遍历网格内的所有方块
                for (let i = 1; i <= GRID_HEIGHT; i++) {
                    for (let j = 1; j <= GRID_WIDTH; j++) {
                        let delta = Math.abs(x - j) + Math.abs(y - i); // 计算与包裹炸弹的距离
                        if (this.cells[i][j] && delta <= 2) { // 在包裹范围内的方块
                            // 如果是特殊方块，将其加入新的炸弹模型列表
                            if (this.cells[i][j].status != CELL_STATUS.COMMON) {
                                newBombModel.push(this.cells[i][j]);
                            }
                            // 消除该方块
                            this.crushCell(j, i, false, cycleCount);
                        }
                    }
                }
            }
            // 处理鸟炸弹
            else if (model.status == CELL_STATUS.BIRD) {
                let crushType = model.type;
                if (bombTime < ANITIME.BOMB_BIRD_DELAY) {
                    bombTime = ANITIME.BOMB_BIRD_DELAY;
                }
                if (crushType == CELL_TYPE.BIRD) {
                    crushType = this.getRandomCellType(); // 如果类型为鸟炸弹，随机选择一种类型进行消除
                }
                // 遍历网格内的所有方块
                for (let i = 1; i <= GRID_HEIGHT; i++) {
                    for (let j = 1; j <= GRID_WIDTH; j++) {
                        if (this.cells[i][j] && this.cells[i][j].type == crushType) {
                            // 如果是特殊方块，将其加入新的炸弹模型列表
                            if (this.cells[i][j].status != CELL_STATUS.COMMON) {
                                newBombModel.push(this.cells[i][j]);
                            }
                            // 消除该方块
                            this.crushCell(j, i, true, cycleCount);
                        }
                    }
                }
                //this.crushCell(model.x, model.y); // 如果需要消除鸟炸弹本身，可以取消注释
            }
        }, this);

        // 如果当前炸弹列表不为空，更新动画时间
        if (bombModels.length > 0) {
            this.curTime += bombTime;
        }
        // 将新的炸弹模型列表赋值给 bombModels，进行下一轮循环
        bombModels = newBombModel;
    }
  }

  /**
   * 
   * @param {开始播放的时间} playTime 
   * @param {*cell位置} pos 
   * @param {*第几次消除，用于播放音效} step 
   */
  addCrushEffect(playTime, pos, step) {
    this.effectsQueue.push({
      playTime,
      pos,
      action: "crush",
      step
    });
  }

  addRowBomb(playTime, pos) {
    this.effectsQueue.push({
      playTime,
      pos,
      action: "rowBomb"
    });
  }

  addColBomb(playTime, pos) {
    this.effectsQueue.push({
      playTime,
      pos,
      action: "colBomb"
    });
  }

  addWrapBomb(playTime, pos) {
    // TODO
  }// cell消除逻辑
  crushCell(x, y, needShake, step) {
    // 获取指定位置的模型
    let model = this.cells[y][x];    
    // 将当前模型加入需要变化的模型列表中，以便后续处理动画或状态变化
    this.pushToChangeModels(model);    
    // 判断是否需要震动效果
    if (needShake) {
        // 如果需要震动，调用模型的 toShake 方法，在当前时间点执行震动动画
        model.toShake(this.curTime);
    }
    // 如果需要震动，则增加消除前的震动时间，否则震动时间为0
    let shakeTime = needShake ? ANITIME.DIE_SHAKE : 0;
    // 调用模型的 toDie 方法，使模型在（当前时间 + 震动时间）之后消失
    model.toDie(this.curTime + shakeTime);
    // 添加消除特效，显示在消除方块的位置，并指定消除的步骤
    this.addCrushEffect(this.curTime + shakeTime, cc.v2(model.x, model.y), step);
    // 将该位置的模型设为空，表示该方块已被消除
    this.cells[y][x] = null;
  }


}

