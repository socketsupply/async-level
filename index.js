'use strict'

const assert = require('assert')

const LevelAsyncIterator = require('./level-async-iterator.js')

const notFoundRegex = /notfound/i

class EncodingError extends Error {
  constructor (cause, prefix) {
    super(prefix + cause.message)

    this.name = 'EncodingError'
    this.type = 'async-level.encoding'
    this.causeErr = cause
    this.status = 404
  }

  cause () {
    return this.causeErr
  }
}

class NotFoundError extends Error {
  constructor (message) {
    super(message)

    this.name = 'NotFoundError'
    this.type = 'async-level.not-found'
    this.notFound = true
  }
}

/**
 * Small wrapper that adds Promise<{ err, data }> support
 * for leveldown
 */
class AsyncLevelDown {
  constructor (db, options = {}) {
    assert(db, 'db required')
    this.leveldown = db

    // Function to encode values
    this.encode = options.encode || identity
    // Function to decode values
    this.decode = options.decode || identity
  }

  open () {
    return new Promise((resolve) => {
      this.leveldown.open((err) => {
        resolve(err ? { err } : {})
      })
    })
  }

  close () {
    return new Promise((resolve) => {
      this.leveldown.close((err) => {
        resolve(err ? { err } : {})
      })
    })
  }

  put (key, value, options) {
    let rawValue
    try {
      rawValue = this.encode(value)
    } catch (err) {
      return {
        err: new EncodingError(err, 'encode in put(): ')
      }
    }

    return new Promise((resolve) => {
      this.leveldown.put(key, rawValue, options || null, (err) => {
        resolve(err ? { err } : {})
      })
    })
  }

  get (key, options) {
    return new Promise((resolve) => {
      this.leveldown.get(key, options || null, (err, value) => {
        if (err) {
          if (notFoundRegex.test(err.message)) {
            return resolve({
              err: new NotFoundError(
                'Key not found in database [' + key + ']'
              )
            })
          }

          return resolve({ err })
        }

        let decoded
        try {
          decoded = this.decode(value)
        } catch (err) {
          resolve({
            err: new EncodingError(err, 'decode in get(): ')
          })
        }

        resolve({ data: decoded })
      })
    })
  }

  del (key, options) {
    return new Promise((resolve) => {
      this.leveldown.del(key, options || null, (err) => {
        resolve(err ? { err } : {})
      })
    })
  }

  iterator (options) {
    const rawItr = this.leveldown.iterator(options)
    const decodeItr = new DecodeIterator(rawItr, this.decode)
    return new LevelAsyncIterator(decodeItr)
  }

  batch (operations, options) {
    const rawOperations = new Array(operations.length)
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]
      let encodedValue
      try {
        encodedValue = this.encode(op.value)
      } catch (err) {
        return {
          err: new EncodingError(err, 'encode in batch(): ')
        }
      }

      rawOperations[i] = new BatchOp(
        op.type, op.key, encodedValue
      )
    }

    return new Promise((resolve) => {
      this.leveldown.batch(
        rawOperations, options || null, (err) => {
          resolve(err ? { err } : {})
        }
      )
    })
  }
}

class DecodeIterator {
  constructor (iterator, decode) {
    this._iterator = iterator
    this.decode = decode
  }

  next (callback) {
    this._iterator.next((err, key, value) => {
      if (err) return callback(err)

      if (key === undefined && value === undefined) {
        return callback(err, key, value)
      }

      let decoded
      try {
        decoded = this.decode(value)
      } catch (err) {
        return callback(
          new EncodingError(err, 'decode in next(): ')
        )
      }

      callback(null, key, decoded)
    })
  }

  seek (target) {
    return this._iterator.seek(target)
  }

  end (callback) {
    return this._iterator.end(callback)
  }
}

class BatchOp {
  constructor (type, key, value) {
    this.type = type
    this.key = key
    this.value = value
  }
}

module.exports = AsyncLevelDown

function identity (x) { return x }
