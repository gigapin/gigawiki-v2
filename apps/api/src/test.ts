/*
import { test } from 'node:test'
//import assert from 'node:assert'
import { equal, deepEqual } from 'node:assert/strict'
import { build } from './app'

test('test', async (t) => {
    const app = await build()
    t.after(async () => {
        await app.close()
    })
    const res = await app.inject({
        method: 'GET',
        url: '/'
    })
    /!*assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.headers['content-type'], 'application/json; charset-utf8')
    assert.strictEqual(res.payload, '{"hello": "world"}')*!/
    equal(res.statusCode, 200)
    equal(res.headers['content-type'], 'application/json; charset=utf-8')
    deepEqual(res.json(), { hello: 'world' })
})*/
