/**
 * @description App
 * @author      C. M. de Picciotto <d3p1@d3p1.dev> (https://d3p1.dev/)
 */
import {Color, Point, Points} from './types'

const COLOR: Color = [54, 107, 93]
const THRESHOLD: number = 80

class App {
  /**
   * @type {CanvasRenderingContext2D}
   */
  #context: CanvasRenderingContext2D

  /**
   * @type {HTMLCanvasElement}
   */
  #canvas: HTMLCanvasElement

  /**
   * @type {HTMLVideoElement}
   */
  #video: HTMLVideoElement

  /**
   * @type {ImageData}
   */
  #imgData: ImageData

  /**
   * @type {[number, number][]}
   */
  #locs: Points = []

  /**
   * @type {[number, number] | []}
   */
  #locCenter: Point | [] = []

  /**
   * @type {[number, number][] | []}
   */
  #locTips: [Point, Point] | [] = []

  /**
   * Constructor
   */
  constructor() {
    this.#initCanvas()
    this.#initVideo()

    this.#addClickEventListener()
  }

  /**
   * Animate
   *
   * @returns {void}
   */
  #animate(): void {
    this.#clear()

    this.#context.drawImage(this.#video, 0, 0)

    this.#locs = []
    this.#locCenter = []
    this.#locTips = []
    this.#processLocs()
    this.#processLocCenter()
    this.#processLocTips()
    this.#stabilizeTips()
    this.#drawLightsaber()

    requestAnimationFrame(this.#animate.bind(this))
  }

  /**
   * Draw lightsaber
   *
   * @returns {void}
   */
  #drawLightsaber(): void {
    if (this.#locTips.length) {
      const color = '#fff'
      const squareDistance = this.#calcSquareDistance(
        this.#locTips[0],
        this.#locTips[1],
      )
      const width = squareDistance * 0.03
      const blur = squareDistance * 0.01
      const tip = this.#vLerp(
        ...this.#locTips,
        Math.min(Math.max(squareDistance * 0.2, 2), 8),
      )

      this.#context.beginPath()
      this.#context.strokeStyle = color
      this.#context.shadowColor = color
      this.#context.shadowBlur = blur
      this.#context.lineWidth = width
      this.#context.lineCap = 'round'
      this.#context.moveTo(this.#locTips[0][0], this.#locTips[0][1])
      this.#context.lineTo(tip[0], tip[1])
      this.#context.stroke()
    }
  }

  /**
   * Stabilize tips
   *
   * @returns {void}
   */
  #stabilizeTips(): void {
    if (this.#locTips.length) {
      const setBottomTip = []
      const setTopTip = []
      for (const loc of this.#locs) {
        if (
          this.#calcSquareDistance(this.#locTips[0], loc) <
          this.#calcSquareDistance(this.#locTips[1], loc)
        ) {
          setBottomTip.push(loc)
        } else {
          setTopTip.push(loc)
        }
      }
      const bottomTip = this.#calcAverage(setBottomTip)
      const topTip = this.#calcAverage(setTopTip)
      this.#locTips = [bottomTip, topTip]
    }
  }

  /**
   * Process loc tips
   *
   * @returns {void}
   */
  #processLocTips(): void {
    if (this.#locCenter.length) {
      this.#locTips[0] = this.#calcFarthestPoint(this.#locCenter, this.#locs)
      this.#locTips[1] = this.#calcFarthestPoint(this.#locTips[0], this.#locs)

      /**
       * @note If the first tip element is not the bottom one, then
       *       flip them
       */
      const y = this.#locTips[0][1] - this.#locCenter[1]
      if (y < 0) {
        const tmpLocs = this.#locTips[0]
        this.#locTips[0] = this.#locTips[1]
        this.#locTips[1] = tmpLocs
      }
    }
  }

  /**
   * Process loc center
   *
   * @returns {void}
   */
  #processLocCenter(): void {
    if (this.#locs.length) {
      this.#locCenter = this.#calcAverage(this.#locs)
    }
  }

  /**
   * Process locs
   *
   * @returns {void}
   */
  #processLocs(): void {
    this.#imgData = this.#context.getImageData(
      0,
      0,
      this.#canvas.width,
      this.#canvas.height,
    )
    const {data} = this.#imgData

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      if (this.#isColorMatch(COLOR, [r, g, b], THRESHOLD)) {
        const index = i / 4
        const x = index % this.#canvas.width
        const y = Math.floor(index / this.#canvas.width)
        this.#locs.push([x, y])
      }
    }
  }

  /**
   * Check if there is a color match with the given threshold
   *
   * @param   {number[]} origin
   * @param   {number[]} target
   * @param   {number}   threshold
   * @returns {boolean}
   */
  #isColorMatch(
    origin: number[],
    target: number[],
    threshold: number,
  ): boolean {
    return this.#calcSquareDistance(origin, target) < threshold
  }

  /**
   * Calc the farthest point
   *
   * @param   {[number, number]}   origin
   * @param   {[number, number][]} points
   * @returns {[number, number]}
   */
  #calcFarthestPoint(origin: Point, points: Points): Point {
    let maxSquareDistance = this.#calcSquareDistance(origin, points[0])
    let farthest = points[0]
    for (let i = 1; i < points.length; i++) {
      const squareDistance = this.#calcSquareDistance(origin, points[i])
      if (squareDistance > maxSquareDistance) {
        maxSquareDistance = squareDistance
        farthest = points[i]
      }
    }
    return farthest
  }

  /**
   * Lerp
   *
   * @param   {number[]} vA
   * @param   {number[]} vB
   * @param   {number}   t
   * @returns {number[]}
   */
  #vLerp(vA: number[], vB: number[], t: number): number[] {
    const point = []
    for (let i = 0; i < vA.length; i++) {
      point.push(this.#lerp(vA[i], vB[i], t))
    }
    return point
  }

  /**
   * Lerp
   *
   * @param   {number} a
   * @param   {number} b
   * @param   {number} t
   * @returns {number}
   * @private
   */
  #lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /**
   * Calc square distance
   *
   * @param   {number[]} origin
   * @param   {number[]} target
   * @returns {number}
   */
  #calcSquareDistance(origin: number[], target: number[]): number {
    let squareDistance = 0
    for (let i = 0; i < origin.length; i++) {
      squareDistance += (target[i] - origin[i]) ** 2
    }
    return squareDistance
  }

  /**
   * Calc average
   *
   * @param   {[number, number][]} points
   * @returns {[number, number]}
   */
  #calcAverage(points: Points): Point {
    let xCenter = 0
    let yCenter = 0
    for (const point of points) {
      xCenter += point[0]
      yCenter += point[1]
    }
    xCenter = Math.floor(xCenter / points.length)
    yCenter = Math.floor(yCenter / points.length)
    return [xCenter, yCenter]
  }

  /**
   * Clear canvas
   *
   * @returns {void}
   */
  #clear(): void {
    this.#context.clearRect(0, 0, this.#canvas.width, this.#canvas.height)
  }

  /**
   * Add click event listener
   *
   * @returns {void}
   */
  #addClickEventListener(): void {
    this.#canvas.addEventListener('click', (e) => {
      if (this.#imgData) {
        const pIndex =
          (this.#imgData.width * e.offsetY +
            (e.offsetX % this.#imgData.width)) *
          4

        console.table({
          r: this.#imgData.data[pIndex],
          g: this.#imgData.data[pIndex + 1],
          b: this.#imgData.data[pIndex + 2],
        })
      }
    })
  }

  /**
   * Init video
   *
   * @returns {void}
   */
  #initVideo(): void {
    navigator.mediaDevices
      .getUserMedia({video: true, audio: false})
      .then((stream) => {
        this.#video = document.createElement('video')
        this.#video.srcObject = stream
        this.#video.onloadeddata = () => {
          this.#canvas.width = this.#video.videoWidth
          this.#canvas.height = this.#video.videoHeight
        }
        this.#video.play().then(this.#animate.bind(this))
      })
      .catch((error) => console.error(error))
  }

  /**
   * Init canvas
   *
   * @returns {void}
   */
  #initCanvas(): void {
    this.#canvas = document.createElement('canvas')
    this.#context = this.#canvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D

    document.body.appendChild(this.#canvas)
  }
}
new App()
