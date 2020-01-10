# async-level

Create an Async friendly interface around leveldown.

## Example

```js
const LevelDown = require('leveldown')
const AsyncLevel = require('async-level')

const leveldown = LevelDown('/db/path')
const db = new AsyncLevel(leveldown, {
  encode: JSON.stringify,
  decode: JSON.parse
})

await levelDB.open()

const { err } = await levelDB.batch([
  {
    type: 'put',
    key: 'foo',
    value: { any: 'json object' }
  },
  {
    type: 'put',
    key: 'foo2',
    value: { your: 'encode func called' }
  }
])

const { err } = await levelDB.put('foo3', {
  id: 'use id',
  email: 'foo@gmail.com'
})

const { err, data: value } = await levelDB.get('foo')
// value is decoded, with JSON.parse.

// This returns an AsyncIterator instead of returning a leveldown
// iterator object.
// You can use for await (const pair of itr) loops over it.
const itr1 = levelDB.iterator({
  gte: '/foo/',
  lte: '/foo/\xFF',
  keyAsBuffer: false
})

const result = await itr.next()
// result.done
// result.value.err
// The data here is decoded with JSON.parse
// result.value.data
```

## Documentation

This is a wrapper class around leveldown. It comes with a few
features like

 - promises support
 - encode & decode
 - `iterator()` method returns an `AsyncIterator` object that's
compatible with `for await (...)` loops and generators.

Currently the `AsyncIterator` does not support concurrent
calls to `next()`

Also note that this is a wrapped around `leveldown`; so it has
all the same caveats as leveldown, for example if you call
`get()` before `open()` finishes your node program just segfaults

## install

```
% npm install optoolco/async-level
```

## No License.
