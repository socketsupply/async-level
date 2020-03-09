'use strict'

const os = require('os')
const path = require('path')
const util = require('util')

const LevelDown = require('leveldown')
const uuid = require('uuid')
const test = require('@pre-bundled/tape')

const AsyncLevel = require('../index.js')

test('AsyncLevel is a fn', (assert) => {
  assert.ok(typeof AsyncLevel === 'function')
  assert.end()
})

test('can read & write & del', async (assert) => {
  const dbPath = path.join(os.tmpdir(), uuid())
  const levelDB = new AsyncLevel(LevelDown(dbPath), {})

  await levelDB.open()

  await levelDB.put('foo', 'bar')
  await levelDB.put('foo2', 'bar2')

  const { err, data: value1 } = await levelDB.get('foo', {
    asBuffer: false
  })
  assert.ifError(err)
  assert.equal(value1, 'bar')

  const { err: err2, data: value2 } = await levelDB.get('foo2', {
    asBuffer: false
  })
  assert.ifError(err2)
  assert.equal(value2, 'bar2')

  await levelDB.del('foo')

  const { err: err3, data: value3 } = await levelDB.get('foo')
  assert.ok(err3)
  assert.equal(value3, null)
  assert.ok(/Key not found/i.test(err3.message))
  assert.ok(err3.notFound)

  await levelDB.close()
  await util.promisify((cb) => {
    LevelDown.destroy(dbPath, cb)
  })()
  assert.end()
})

test('can read & write & del with ensure', async (assert) => {
  const dbPath = path.join(os.tmpdir(), uuid())
  const levelDB = new AsyncLevel(LevelDown(dbPath), {})

  await levelDB.ensure()
  await levelDB.put('foo', 'bar')

  await levelDB.ensure()
  await levelDB.put('foo2', 'bar2')

  await levelDB.ensure()
  const { err, data: value1 } = await levelDB.get('foo', {
    asBuffer: false
  })
  assert.ifError(err)
  assert.equal(value1, 'bar')

  await levelDB.ensure()
  const { err: err2, data: value2 } = await levelDB.get('foo2', {
    asBuffer: false
  })
  assert.ifError(err2)
  assert.equal(value2, 'bar2')

  await levelDB.ensure()
  await levelDB.del('foo')

  await levelDB.ensure()
  const { err: err3, data: value3 } = await levelDB.get('foo')
  assert.ok(err3)
  assert.equal(value3, null)
  assert.ok(/Key not found/i.test(err3.message))
  assert.ok(err3.notFound)

  await levelDB.close()
  await util.promisify((cb) => {
    LevelDown.destroy(dbPath, cb)
  })()
  assert.end()
})

test('can batch writes', async (assert) => {
  const dbPath = path.join(os.tmpdir(), uuid())
  const levelDB = new AsyncLevel(LevelDown(dbPath), {})

  await levelDB.open()

  await levelDB.batch([
    { type: 'put', key: 'foo', value: 'bar' },
    { type: 'put', key: 'foo2', value: 'bar2' }
  ])

  const { err, data: value1 } = await levelDB.get('foo', {
    asBuffer: false
  })
  assert.ifError(err)
  assert.equal(value1, 'bar')

  const { err: err2, data: value2 } = await levelDB.get('foo2', {
    asBuffer: false
  })
  assert.ifError(err2)
  assert.equal(value2, 'bar2')

  await levelDB.close()
  await util.promisify((cb) => {
    LevelDown.destroy(dbPath, cb)
  })()
  assert.end()
})

test('can iterate a db', async (assert) => {
  const dbPath = path.join(os.tmpdir(), uuid())
  const levelDB = new AsyncLevel(LevelDown(dbPath), {})

  await levelDB.open()

  await levelDB.batch([
    { type: 'put', key: '1_one', value: 'one' },
    { type: 'put', key: '2_two', value: 'two' },
    { type: 'put', key: '3_three', value: 'three' }
  ])

  const itr = levelDB.iterator({
    gte: '',
    lte: '\xFF',
    keyAsBuffer: false,
    valueAsBuffer: false
  })

  let result = await itr.next()
  assert.ok(!result.done)
  assert.ifError(result.value.err)
  assert.ok(result.value.data)
  assert.equal(result.value.data.key, '1_one')
  assert.equal(result.value.data.value, 'one')

  result = await itr.next()
  assert.equal(result.value.data.key, '2_two')
  assert.equal(result.value.data.value, 'two')

  result = await itr.next()
  assert.equal(result.value.data.key, '3_three')
  assert.equal(result.value.data.value, 'three')

  result = await itr.next()
  assert.ok(result.done)

  result = await itr.next()
  assert.ok(result.done)

  await levelDB.close()
  await util.promisify((cb) => {
    LevelDown.destroy(dbPath, cb)
  })()
  assert.end()
})

test('can query a range', async (assert) => {
  const dbPath = path.join(os.tmpdir(), uuid())
  const levelDB = new AsyncLevel(LevelDown(dbPath), {})

  await levelDB.open()

  await levelDB.batch([
    { type: 'put', key: '/foo', value: 'one' },
    { type: 'put', key: '/foo/one', value: 'two' },
    { type: 'put', key: '/foo/two', value: 'three' },
    { type: 'put', key: '/bar', value: 'one' },
    { type: 'put', key: '/bar/one', value: 'two' },
    { type: 'put', key: '/bar/two', value: 'three' }
  ])

  const itr1 = levelDB.iterator({
    gte: '/foo/',
    lte: '/foo/\xFF',
    keyAsBuffer: false,
    valueAsBuffer: false
  })

  const values1 = await drainIterator(itr1)
  assert.deepEqual(values1, [{
    key: '/foo/one', value: 'two'
  }, {
    key: '/foo/two', value: 'three'
  }])

  const itr2 = levelDB.iterator({
    gte: '/bar/',
    lte: '/bar/\xFF',
    keyAsBuffer: false,
    valueAsBuffer: false
  })

  const values2 = await drainIterator(itr2)
  assert.deepEqual(values2, [{
    key: '/bar/one', value: 'two'
  }, {
    key: '/bar/two', value: 'three'
  }])

  await levelDB.close()
  await util.promisify((cb) => {
    LevelDown.destroy(dbPath, cb)
  })()
  assert.end()
})

test('itr can batch next', async (assert) => {
  const dbPath = path.join(os.tmpdir(), uuid())
  const levelDB = new AsyncLevel(LevelDown(dbPath), {})

  await levelDB.open()

  await levelDB.batch([
    { type: 'put', key: '/foo', value: 'one' },
    { type: 'put', key: '/foo/one', value: 'two' },
    { type: 'put', key: '/foo/two', value: 'three' },
    { type: 'put', key: '/bar', value: 'one' },
    { type: 'put', key: '/bar/one', value: 'two' },
    { type: 'put', key: '/bar/two', value: 'three' }
  ])

  const itr1 = levelDB.iterator({
    gte: '/foo/',
    lte: '/foo/\xFF',
    keyAsBuffer: false,
    valueAsBuffer: false
  })

  const r = await itr1.batchNext()
  assert.equal(r.done, false)
  assert.ok(r.value)
  assert.ifError(r.value.err)
  assert.ok(r.value.data)
  assert.ok(r.value.data.keys)
  assert.ok(r.value.data.values)

  const { keys, values } = r.value.data
  assert.deepEqual(keys, ['/foo/one', '/foo/two'])
  assert.deepEqual(values, ['two', 'three'])

  await levelDB.close()
  await util.promisify((cb) => {
    LevelDown.destroy(dbPath, cb)
  })()
  assert.end()
})

test('json encode & decode', async (assert) => {
  const dbPath = path.join(os.tmpdir(), uuid())
  const levelDB = new AsyncLevel(LevelDown(dbPath), {
    encode: JSON.stringify,
    decode: JSON.parse
  })

  await levelDB.open()

  await levelDB.batch([
    {
      type: 'put',
      key: 'foo',
      value: { type: 'obj', box: 'bar' }
    },
    {
      type: 'put',
      key: 'foo2',
      value: { type: 'obj', box: 'bar2' }
    }
  ])
  await levelDB.put('foo3', { type: 'obj', box: 'bar3' })

  const { err, data: value1 } = await levelDB.get('foo')
  assert.ifError(err)
  assert.deepEqual(value1, { type: 'obj', box: 'bar' })

  const { err: err2, data: value2 } = await levelDB.get('foo2')
  assert.ifError(err2)
  assert.deepEqual(value2, { type: 'obj', box: 'bar2' })

  const { err: err3, data: value3 } = await levelDB.get('foo3')
  assert.ifError(err3)
  assert.deepEqual(value3, { type: 'obj', box: 'bar3' })

  const itr1 = levelDB.iterator({
    gte: '',
    lte: '\xFF',
    keyAsBuffer: false
  })

  const values1 = await drainIterator(itr1)
  assert.deepEqual(values1, [{
    key: 'foo', value: { type: 'obj', box: 'bar' }
  }, {
    key: 'foo2', value: { type: 'obj', box: 'bar2' }
  }, {
    key: 'foo3', value: { type: 'obj', box: 'bar3' }
  }])

  await levelDB.close()
  await util.promisify((cb) => {
    LevelDown.destroy(dbPath, cb)
  })()
  assert.end()
})

async function drainIterator (itr) {
  const values = []
  let result
  do {
    result = await itr.next()
    if (result.done) break
    if (result.value.err) throw result.value.err
    values.push(result.value.data)
  } while (!result.done)

  return values
}
