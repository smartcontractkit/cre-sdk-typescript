import { describe, expect, test } from 'bun:test'
import { LazyPromise } from './lazy-promise'

describe('test lazy promise', () => {
    describe('runs async and only blocks when awaited', () => {
        test('directly on the promise', async () => {
            var value = 0
            const lp1 = new LazyPromise(() => { return value++ })
            const lp2 = new LazyPromise(() => { return value++ })
            const val2 = await lp2
            const val1 = await lp1
            expect(val2).toBe(0)
            expect(val1).toBe(1)
        })
            
        test('then fulfilled on the promise', async () => {
            var value = 0
            const lp1 = new LazyPromise(() => { console.log("Called"); return value++ })
            const lp2 = new LazyPromise(() => { console.log("Called 2"); return value++ })

            const then1 = lp1.then(v => v == 1)
            const then2 = lp2.then(v => v == 0)
        
            expect(await then2).toBe(true)
            expect (await then1).toBe(true)
        })

        test('then rejected on the promise', async () => {
            var value = 0
            const lp1 = new LazyPromise(() => { throw value++ })
            const lp2 = new LazyPromise(() => { throw value++ })
            const then1 = lp1.then(null, v => v == 1)
            const then2 = lp2.then(null, v => v == 0)
            expect(await then2).toBe(true)
            expect (await then1).toBe(true)
        })

        test('catch on the promise', async () => {
            var value = 0
            const lp1 = new LazyPromise(() => { throw value++ })
            const lp2 = new LazyPromise(() => { throw value++ })
            const catch1 = lp1.catch(v => v == 1)
            const catch2 = lp2.catch(v => v == 0)
            expect(await catch2).toBe(true)
            expect (await catch1).toBe(true)
        })

        test('finally on the promise', async () => {
            var final2First = false
            var final1Done = false
            const lp1 = new LazyPromise(() => 0)
            const lp2 = new LazyPromise(() => 1)
            const finally1 = lp1.finally(() => { final1Done = true})
            const finally2 = lp2.finally(() => { final2First = !final1Done })
            await finally2
            await finally1
            expect(final2First).toBe(true)
            expect(final1Done).toBe(true)
        })
    })
    
})