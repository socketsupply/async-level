# async-level

Create an async friendly interface around leveldown.

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
if (openErr) throw openErr

const { err } = await levelDB.put('foo#three', {
  id: 'user id',
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
    key: 'foo#one',
    value: { any: 'json object' }
  },
  {
    type: 'put',
    key: 'foo#two',
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

## Motivation

A simpler API around `leveldown` with basic features like

 - async/await support, including `{ err, data } = await`
 - encode, decode & keyEncode
 - `iterator()` method that returns `AsyncIterator`

This library returns `{ err, data }` from all it's promises
like documented in [resultify](https://github.com/Raynos/resultify)

The alternative library `level` has quite a bit of code and weight
in it, including features we do not need like streams and normal
promises that reject/throw.

This alterive library `async-level` is single file, zero dependencies
and clocks in at <500 lines of code.

## Documentation

`AsyncLevel` provides a class to wrap `leveldown` and adds
some quality of life API improvements including `promises`,
`encode`, `decode` & `keyEncode` as well as `iterator` returning
an `AsyncIterator`.

Currently the `AsyncIterator` does not support concurrent
calls to `next()`

## CAVEAT

Also note that this is a wrapped around `leveldown`; so it has
all the same caveats as leveldown, for example if you call
`get()` before `open()` finishes your node program just segfaults

### `const db = new AsyncLevel(leveldown, options)`

Calling `AsyncLevel` with `leveldown` and options creates a `db`
object.

 - `leveldown` must be an instance of `leveldown`
 - `options.encode` is an optional encoding function like
      `JSON.stringify`
 - `options.decode` is an optional decoding function like
      `JSON.parse`
 - `options.keyEncode` is an optional key encoding function like
      `require('charwise').encode`
 - `options.valueEncoding` ; for backwards compatibility with
      `level` you can set `options.valueEncoding: 'json'` to
      enable `JSON.parse` & `JSON.stringify` for `decode` & `encode`.

### `await db.ensure()`

You cannot interact with `leveldown` until the database is open.

Calling `await db.ensure()` will wait until the database is open.

`levelup` had a feature where it would enqueue all your reads
and writes until the database is open.

Instead, with `async-level` you can add `await db.ensure()`
to the top of any method that wants to do any reads or writes
on a potentially un-open database. This will ensure the database
is open.

### `const { err } = await db.open()`

Open the database and get an `err` back if it failed.

### `const { err } = await db.close()`

Close the database and get an `err` back if it failed.

### `const { err } = await db.put(key, value)`

Write a key/value to the database. Get an `err` back if it failed.

If you specified `encode`, `decode` or `keyEncode` in the constructor
then those will be respected for encoding of `key` and `value`.

### `const { err, data } = await db.get(key)`

Retrives a `key` from the database. Get an `err` or a `data`
back.

If you specified `encode`, `decode` or `keyEncode` in the constructor
then those will be respected for encoding of `key` and `data`.

If the key is not found then it will return an `err` which has
a `err.notFound === true` property on it.

### `const { err } = await db.del(key)`

Deletes a key from the database. Get an `err` back if it failed.

If you specified `keyEncode` in the constructor then it will be
respected for encoding of `key`

### `const { err } = await db.batch(operations)`

Writes a batch to the database. Get an `err` back if it failed.

The `operations` parameter must be an `Array` of objects with
three properties, `type`, `key` and `value`.

The `type` field can be `'put'` or `'del'`

If you specified `encode`, `decode` or `keyEncode` in the constructor
then those will be respected for encoding of `key` and `value`.

### `const { err } = await db.clear(options)`

Clear a range of key/value pairs in the levelDB database.
Options are passed to `leveldown.clear()` and include:
 `gt`, `gte`, `lt`, `lte`, `reverse`, `limit`.

### `const itr = db.iterator(options)`

Creates an `AsyncIterator` for the database. Note that this method
does not return a promise and does not need `await`.

The `AsyncIterator` returned is compatible with `for await` loops.

If you specified `encode`, `decode` or `keyEncode` in the constructor
then those will be respected for encoding of `key` and `value`.

[See `leveldown.iterator()` docs](https://github.com/Level/leveldown#leveldown_iterator)

The `options` object is passed to `leveldown.iterator()`

### `const r = await itr.next()`

Gets the next key/value pair from the iterator. This returns
an `IteratorResult` with `r.done` and `r.value`.

If `r.done` is `true` then the iterator is finished.
The `r.value` contains `r.value.err` and `r.value.data`.

If there was an `err` reading from the iterator then you get
`r.value.err` otherwise `r.value.data` contains a key and a value.

Aka `r.value.data.key` and `r.value.data.value` are returned
from the iterator for the key and value.

 - `r.done`; boolean, if true the iterator is finished
 - `r.value.err`; optional Error; if it exists then there was an error
 - `r.value.data.key`; the key for this iterator value
 - `r.value.data.value`; the value for this iterator value.

### `const { err } = await itr.close()`

This closes the iterator. Must be closed if you do not read the
iterator to completion.

### `const r = await itr.batchNext()`

Like `next()` but returns `keys` and `values` aka

 - `r.value.data.keys`; an array of keys
 - `r.value.data.values`;  an array of values.

If you use `batchNext()` we recommend using a decent `highWaterMark`

```js
const itr = db.iterator({
  gt: '...',
  lte: '...',
  highWaterMark: 1024 * 1024
})
```

#### `batchNext()` optimization.

For some applications it's really useful to read a batch of
key value pairs out of the `Iterator` in one go.

The `AsyncIterator` supports an `await batchNext()` method that
returns an array of keys & an array of values.

The maximum length is 1000 and the maximum size is based on
the highWaterMark that you pass to leveldown (default 16kb).

## install

```
% npm install async-level
```

## MIT License.
