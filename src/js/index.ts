// Tailwindcss
import '../css/style.css'
// MediaPipe
import {
  FilesetResolver,
  GestureRecognizer,
  GestureRecognizerResult
} from '@mediapipe/tasks-vision'

import { min, random } from 'lodash'
import { maxAge, maxScore, questionCount } from './constants'
import { init, state } from './states'
import { Answer, Question, Shoot, Status } from './type'
import { preloadAll, sleep } from './utils'

async function main() {
  // canvasエレメントを取得
  const canvas = <HTMLCanvasElement>document.getElementById('canvas')!
  const adjustCanvasSize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  adjustCanvasSize()
  window.onresize = adjustCanvasSize
  const context2D = canvas.getContext('2d')!
  // videoエレメントを作成
  const video = document.createElement('video')
  // Start画面
  const notStartedScreen = <HTMLButtonElement>(
    document.getElementById('notStarted')
  )
  // ローディング画面
  const readyScreen = <HTMLButtonElement>document.getElementById('ready')
  // 結果画面
  const completedScreen = <HTMLButtonElement>(
    document.getElementById('completed')
  )
  // Startボタンを取得
  const startButton = <HTMLButtonElement>document.getElementById('btnStart')
  // 円を取得
  const circle = <HTMLOrSVGElement>document.getElementById('circle')
  const pathLength = (circle as SVGPathElement).getTotalLength()
  ;(circle as SVGPathElement).style.strokeDasharray = pathLength.toFixed()
  ;(circle as SVGPathElement).style.strokeDashoffset = '0'

  // カウントダウンを取得
  const countDown = <HTMLDivElement>document.getElementById('countDown')
  // スコア（脳年齢）表示を取得
  const scoreText = <HTMLParagraphElement>document.getElementById('textScore')
  // やり直しボタンを取得
  const restartButton = <HTMLButtonElement>document.getElementById('btnRestart')

  const [rock, scissors, paper] = await preloadAll([
    './assets/rock.jpg',
    './assets/scissors.jpg',
    './assets/paper.jpg'
  ])
  const imageWidth = min([canvas.width / 2, rock.width]) ?? rock.width
  const imageHeight = (rock.height / rock.width) * imageWidth

  // ジェスチャー認識モデルをロード
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
  )
  const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO'
  })

  /**
   * スタートボタン押下時の処理
   */
  startButton.onclick = async (e: MouseEvent) => {
    // カメラ映像をvideoにアタッチ
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user'
        }
      })
      video.srcObject = stream
      video.onloadedmetadata = async () => {
        // ビデオを再生
        video.play()

        // ビデオ映像のロードが完了したらループ処理スタート
        await tick(0)

        // 初期化
        init()

        // スタート画面非表示
        notStartedScreen.classList.remove('flex')
        notStartedScreen.classList.add('hidden')

        // ローディング画面表示
        readyScreen.classList.remove('hidden')
        readyScreen.classList.add('flex')

        // スタート
        state.currentState = Status.START
      }
    } catch (e) {
      console.error(e)
      return
    }
  }

  /**
   * やり直しボタン押下時の処理
   */
  restartButton.onclick = (e: MouseEvent) => {
    // 結果画面非表示
    completedScreen.classList.remove('flex')
    completedScreen.classList.add('hidden')

    // スタート画面表示
    notStartedScreen.classList.remove('hidden')
    notStartedScreen.classList.add('flex')

    // ステートを戻す
    state.currentState = Status.NOT_STARTED
  }

  // 最終更新時間
  let lastVideoTime = -1
  // ループ処理
  const tick = async (pref: number) => {
    // ジェスチャー認識結果を処理
    if (video.currentTime !== lastVideoTime) {
      const gestureRecognitionResult = gestureRecognizer.recognizeForVideo(
        video,
        Date.now()
      )
      state.shoot = getCategoryName(gestureRecognitionResult)
      update(state.shoot, video.currentTime)
      lastVideoTime = video.currentTime
    }

    draw(context2D, pref)

    window.requestAnimationFrame(tick)
  }

  /**
   * 検出したジェスチャーからじゃんけんの手を返す
   */
  const getCategoryName = (
    result: GestureRecognizerResult
  ): Shoot | undefined => {
    switch (result.gestures?.[0]?.[0]?.categoryName) {
      case 'Closed_Fist':
        return 0
      case 'Victory':
        return 1
      case 'Open_Palm':
        return 2
      default:
        return undefined
    }
  }

  /**
   * 勝敗を決定する
   */
  const judge = (shoot: Shoot, question: Question): boolean | undefined => {
    switch (shoot) {
      case 0:
        if (question.shoot === 1 && question.operation === 'win') {
          return true
        }
        if (question.shoot === 2 && question.operation === 'lose') {
          return true
        }
        return false
      case 1:
        if (question.shoot === 2 && question.operation === 'win') {
          return true
        }
        if (question.shoot === 0 && question.operation === 'lose') {
          return true
        }
        return false
      case 2:
        if (question.shoot === 0 && question.operation === 'win') {
          return true
        }
        if (question.shoot === 1 && question.operation === 'lose') {
          return true
        }
        return false
      default:
        return undefined
    }
  }

  /**
   * スコア計算
   */
  const calculateScore = (answers: Answer[]): number => {
    // 初期スコア
    let score = 0
    // 前回の解答時間
    let lastTimestamp = 0
    // スコア計算
    answers.map((answer) => {
      // 問題数に応じて加点スコアを計算、全問正解で100
      let addScore = answer.answer ? maxScore / questionCount : 0
      // 前回の解答からの経過時間
      const diff = answer.timestamp - lastTimestamp
      if (diff > 3000) {
        // 3秒以上で半分
        addScore -= maxScore / questionCount / 2
      } else if (diff > 5000) {
        // 5秒以上で0
        addScore = 0
      }
      // スコア加点
      score += addScore
      // 前回解答時間の更新
      lastTimestamp = answer.timestamp
    })
    return score
  }

  let lastCountAt: number | undefined = undefined
  let counter: number | undefined = undefined
  let diff: number = 0

  /**
   * アップデート処理
   */
  const update = async (
    shoot: Shoot | undefined,
    timestamp: number
  ): Promise<void> => {
    // 次のステップに
    if (state.currentState === Status.START) {
      state.currentState = Status.READY
      return
    }
    // 3秒経過してから回答受付中に変更
    if (state.currentState === Status.READY) {
      if (!lastCountAt) {
        lastCountAt = timestamp
        counter = 3
      }
      diff = timestamp - lastCountAt
      if (counter !== undefined && diff >= 1) {
        counter--
        lastCountAt = timestamp
      }
      if (counter !== undefined && counter <= 0) {
        // ローディング画面非表示
        readyScreen.classList.remove('flex')
        readyScreen.classList.add('hidden')

        // 受付中に更新
        state.currentState = Status.ACCEPTING
      }
      return
    }

    // 判定完了の場合は手をおろしたら次の質問へ
    if (state.currentState === Status.JUDGED) {
      if (shoot === undefined) {
        state.currentState = Status.ACCEPTING
      }
    }

    // 回答受付中でない場合は何もしない
    if (state.currentState !== Status.ACCEPTING) return

    // 問題を取得
    if (state.question === undefined) {
      state.question = state.questions.shift()!
    }

    // 手が決まらないうちは何もしない
    if (shoot === undefined) return

    // 前回の手と今回の手が異なる場合は、前回の手を更新して更新時間を記録する
    if (state.lastShoot !== shoot) {
      state.lastShoot = shoot
      state.lastShootUpdateAt = video.currentTime
    }
    // 前回更新から0.5秒未満の場合は勝敗を決定しない
    if (video.currentTime - state.lastShootUpdateAt < 0.5) {
      return
    }

    // ジェスチャー認識から勝ち負けを判定
    const answer = judge(shoot, state.question)

    // 判定できない場合はここで終了
    if (answer === undefined) return

    // 判定中に変更
    state.currentState = Status.JUDGEMENT

    // 判定できた場合はもう一度カウントアップするために更新時間を記録する
    state.lastShootUpdateAt = video.currentTime

    // 解答と解答時間を記録
    state.answers.push({ answer, timestamp })
    await sleep(1000)

    // 最終問題の場合は結果画面
    if (state.questions.length === 0) {
      // スコア計算
      state.score = calculateScore(state.answers)
      // 脳年齢に変換 20-80歳
      state.brainAge = Math.round(maxAge - state.score * 0.6)

      // 結果画面表示
      state.currentState = Status.FINISHED
      await sleep(3000)
      state.currentState = Status.COMPLETED
      return
    }

    // 次の問題を準備
    state.question = undefined
    state.currentState = Status.JUDGED
  }

  /**
   * Videoを描画
   *
   * @param context2D
   */
  const drawVideo = (context2D: CanvasRenderingContext2D) => {
    context2D.save()
    context2D.scale(-1, 1)
    const widthRetio = canvas.width <= 640 ? 3 : 6
    const w = canvas.width / widthRetio
    const h = (video.videoHeight / video.videoWidth) * w
    const dx = -canvas.width + w
    const dy = canvas.height - h
    const dw = -w
    const dh = h
    context2D.drawImage(video, dx, dy, dw, dh)
    context2D.restore()
  }

  /**
   * 質問を描画
   *
   * @param operation
   */
  const drawQuestion = (
    context2D: CanvasRenderingContext2D,
    operation: 'win' | 'lose'
  ) => {
    context2D.save()
    context2D.font = '48px sans-serif'
    context2D.textAlign = 'center'
    context2D.fillText(
      operation === 'win' ? '勝ってください' : '負けてください',
      canvas.width / 2,
      canvas.height / 2 - 48 / 2 - imageHeight / 2
    )
    context2D.restore()
  }

  /**
   * 手を描画
   *
   * @param context2D
   * @param shoot
   * @param reverse
   */
  const drawHand = (
    context2D: CanvasRenderingContext2D,
    shoot: Shoot | undefined,
    reverse?: boolean
  ) => {
    context2D.save()
    reverse && context2D.scale(-1, 1)
    const dx = reverse ? -(canvas.width / 2 - imageWidth) : canvas.width / 2
    const dy = canvas.height / 2 - imageHeight / 2
    const dw = reverse ? -imageWidth : imageWidth
    const dh = imageHeight
    switch (shoot) {
      case 0:
        context2D.drawImage(rock, dx, dy, dw, dh)
        break
      case 1:
        context2D.drawImage(scissors, dx, dy, dw, dh)
        break
      case 2:
        context2D.drawImage(paper, dx, dy, dw, dh)
        break
      default:
        break
    }
    context2D.restore()
  }

  /**
   * 回答を表示
   *
   * @param context2D
   * @param answers
   */
  const drawAnswer = (
    context2D: CanvasRenderingContext2D,
    answers: Answer[]
  ) => {
    const answer = answers[answers.length - 1]
    const offset = 100
    const dw =
      (min([canvas.width, canvas.height]) ?? canvas.height) - offset * 2
    context2D.save()
    if (answer.answer) {
      context2D.lineWidth = 5
      context2D.strokeStyle = 'rgb(225, 0, 0)'
      context2D.beginPath()
      context2D.arc(
        canvas.width / 2,
        canvas.height / 2,
        dw / 2,
        0,
        Math.PI * 2,
        true
      )
      context2D.stroke()
    } else {
      context2D.lineWidth = 5
      context2D.strokeStyle = 'rgb(0, 25, 255)'
      context2D.beginPath()
      context2D.moveTo(canvas.width / 2 - dw / 2, canvas.height / 2 - dw / 2)
      context2D.lineTo(canvas.width / 2 + dw / 2, canvas.height / 2 + dw / 2)
      context2D.stroke()
      context2D.moveTo(canvas.width / 2 - dw / 2, canvas.height / 2 + dw / 2)
      context2D.lineTo(canvas.width / 2 + dw / 2, canvas.height / 2 - dw / 2)
      context2D.stroke()
    }
    context2D.restore()
  }

  /**
   * 描画処理
   */
  const draw = (
    context2D: CanvasRenderingContext2D,
    timestamp: number
  ): void => {
    // 画面をクリア
    context2D.clearRect(0, 0, canvas.width, canvas.height)

    // Videoを表示
    drawVideo(context2D)

    // 未スタート、スタート時は何もしない
    if (
      state.currentState === Status.NOT_STARTED ||
      state.currentState === Status.START
    ) {
      return
    }

    // 準備中
    if (state.currentState === Status.READY) {
      ;(circle as SVGPathElement).style.strokeDashoffset = (
        pathLength * diff
      ).toFixed()
      countDown.innerText = counter?.toFixed() ?? ''
      return
    }

    // 回答受付中
    if (state.currentState === Status.ACCEPTING) {
      if (state.question) {
        // 問題の指示
        drawQuestion(context2D, state.question.operation)
        // 問題の手
        drawHand(context2D, state.question.shoot, true)
      }

      // ユーザーの手
      drawHand(context2D, state.shoot)
      return
    }

    // 判定中、判定完了の場合
    if (
      state.currentState === Status.JUDGEMENT ||
      state.currentState === Status.JUDGED
    ) {
      if (state.question) {
        // 問題の指示
        drawQuestion(context2D, state.question.operation)
        // 問題の手
        drawHand(context2D, state.question.shoot, true)
      }

      // ユーザーの手
      drawHand(context2D, state.lastShoot)

      // 回答
      drawAnswer(context2D, state.answers)
      return
    }

    // スコア計算中
    if (state.currentState === Status.FINISHED) {
      if (completedScreen.classList.contains('hidden')) {
        completedScreen.classList.remove('hidden')
        completedScreen.classList.add('flex')
      }
      scoreText.textContent = `${random(20, 80)}歳`
      return
    }

    // スコア（脳年齢）表示画面
    if (state.currentState === Status.COMPLETED) {
      scoreText.textContent = `${state.brainAge}歳`
      return
    }
  }
}

window.onload = main
