# async-level

Create an Async friendly interface around leveldown.

Lightweight, zero dependency, single file alternative to `levelup`.

## Example (put, get)

```js
const LevelDown = require('leveldown')
const AsyncLevel = require('async-level')

const leveldown = LevelDown('/db/path')
const db = new AsyncLevel(leveldown, {
  encode: JSON.stringify,
  decode: JSON.parse
})

const { err: openErr } = await levelDB.open()
if (openErr) throw

const { err } = await levelDB.put('foo#three', {
  id: 'use id',
  email: 'foo@gmail.com'
})

const { err, data: value } = await levelDB.get('foo#one')
// value is decoded, with JSON.parse.
```

## Example (async iterator)

```js
const LevelDown = require('leveldown')
const AsyncLevel = require('async-level')

const leveldown = LevelDown('/db/path')
const db = new AsyncLevel(leveldown, {
  encode: JSON.stringify,
  decode: JSON.parse
})

const { err: openErr } = await levelDB.open()
if (openErr) throw

// This returns an AsyncIterator instead of returning a leveldown
// iterator object.
// You can use for await (const pair of itr) loops over it.
const itr1 = levelDB.iterator({
  gte: 'foo' + '\x00',
  lte: 'foo' + '\xFF',
  keyAsBuffer: false
})

const result = await itr.next()
// result.done
// result.value.err
// The data here is decoded with JSON.parse
// result.value.data
```

## Example (batch)

```js
const LevelDown = require('leveldown')
const AsyncLevel = require('async-level')

const leveldown = LevelDown('/db/path')
const db = new AsyncLevel(leveldown, {
  encode: JSON.stringify,
  decode: JSON.parse
})

const { err: openErr } = await levelDB.open()
if (openErr) throw

const { err } = await levelDB.batch([
  {
    type: 'put',
    key: ['foo', 'one'],
    value: { any: 'json object' }
  },
  {
    type: 'put',
    key: ['foo', 'two'],
    value: { your: 'encode func called' }
  }
])
```

## Example (key encoding)

```js
const LevelDown = require('leveldown')
const AsyncLevel = require('async-level')
const charwise = require('charwise-compact')

const leveldown = LevelDown('/db/path')
const db = new AsyncLevel(leveldown, {
  encode: JSON.stringify,
  keyEncode: charwise.encode,
  decode: JSON.parse
})

await levelDB.open()

const { err } = await levelDB.put(['foo', 'three'], {
  id: 'use id',
  email: 'foo@gmail.com'
})

const { err, data: value } = await levelDB.get(['foo', 'one'])
// value is decoded, with JSON.parse.

const itr1 = levelDB.iterator({
  gte: ['foo', charwise.LO],
  lte: ['foo', charwise.HI],
  keyAsBuffer: false
})
```

## Documentation

This is a wrapper class around leveldown. It comes with a few
features like

 - promises support
 - encode, decode & keyEncode
 - `iterator()` method returns an `AsyncIterator` object that's
compatible with `for await (...)` loops and generators.

Currently the `AsyncIterator` does not support concurrent
calls to `next()`

Also note that this is a wrapped around `leveldown`; so it has
all the same caveats as leveldown, for example if you call
`get()` before `open()` finishes your node program just segfaults

### `batchNext()` optimization.

For some applications it's really useful to read a batch of
key value pairs out of the `Iterator` in one go.

The `AsyncIterator` supports an `await batchNext()` method that
returns an array of keys & an array of values.

The maximum length is 1000 and the maximum size is based on
the highWaterMark that you pass to leveldown (default 16kb).

## install

```
% npm install optoolco/async-level
```

## No License.
