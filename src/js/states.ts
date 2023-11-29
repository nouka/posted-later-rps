// 初期化

import { random } from 'lodash'
import { questionCount } from './constants'
import { Shoot, State, Status } from './type'

export let state: State = {
  currentState: Status.NOT_STARTED,
  questions: [],
  question: undefined,
  answers: [],
  shoot: undefined,
  lastShoot: undefined,
  lastShootUpdateAt: 0,
  score: 0,
  brainAge: undefined
}

export const init = () => {
  state.questions = Array(questionCount)
    .fill(0)
    .map(() => ({
      shoot: random(0, 2) as Shoot,
      operation: random(0, 1) ? 'win' : 'lose'
    }))
  state.question = undefined
  state.answers = []
  state.shoot = undefined
  state.lastShoot = undefined
  state.lastShootUpdateAt = 0
  state.score = 0
  state.brainAge = undefined
}
