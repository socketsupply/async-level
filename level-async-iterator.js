'use strict'

class LevelAsyncIterator {
  constructor (levelDownItr) {
    this._iterator = levelDownItr
    this.finished = false

    this.pendingNext = false
  }

  /**
   * TODO: Support parallel iteration.
   * This class has a lot of simplification in it based on the
   * assumption that the consumer will only call `next()`
   * sequentially.
   *
   * See https://github.com/nodejs/node/blob/master/lib/internal/streams/async_iterator.js
   */
  async next () {
    if (this.pendingNext) {
      throw new Error(
        'It is not safe to call Iterator.next() concurrently'
      )
    }
    this.pendingNext = true
    return new Promise((resolve, reject) => {
      if (this.finished) {
        this.pendingNext = false
        return resolve({ done: true })
      }

      this._iterator.next((err, key, value) => {
        this.pendingNext = false
        if (err) {
          this._finish(onFinish)
          return
        }

        if (key === undefined && value === undefined) {
          this._finish(onFinish)
          return
        }

        resolve({
          done: false,
          value: { data: { key, value } }
        })

        function onFinish (finishErr) {
          if (err || finishErr) {
            return resolve({
              done: false,
              value: { err: err || finishErr }
            })
          }

          return resolve({ done: true })
        }
      })
    })
  }

  _finish (cb) {
    if (this.finished) {
      return cb(null)
    }

    this.finished = true
    this._iterator.end(cb)
  }

  [Symbol.asyncIterator] () {
    return this
  }

  async close () {
    return new Promise((resolve, reject) => {
      this._finish((err) => {
        if (err) {
          return resolve({ err })
        }
        resolve({})
      })
    })
  }
}

module.exports = LevelAsyncIterator
