/**
 * ステータス
 */
export enum Status {
  NOT_STARTED, // 未スタート
  START, // スタート
  READY, // 準備中
  ACCEPTING, // 回答受付中
  JUDGEMENT, // 判定中
  FINISHED, // 回答完了
  COMPLETED // 結果表示
}

/**
 * 質問
 * shoot: 0...グー, 1...チョキ, 2...パー
 * operation: win...勝ってください, lose...負けてください
 */
export type Question = {
  shoot: Shoot
  operation: 'win' | 'lose'
}

/**
 * 回答
 * answer: true...正解, false...不正解
 * timestamp: 解答時の時間
 */
export type Answer = {
  answer: boolean
  timestamp: number
}

/**
 * 手
 * 0...グー, 1...チョキ, 2...パー
 */
export type Shoot = 0 | 1 | 2

/**
 * ステート
 */
export type State = {
  currentState: Status
  questions: Question[]
  question: Question | undefined
  answers: Answer[]
  shoot: Shoot | undefined
  lastShoot: Shoot | undefined
  lastShootUpdateAt: number
  score: number
  brainAge: number | undefined
}
