/**
 * Unit tests for TestWriter. Harness test framework (Step 3).
 */
import { describe, expect, test } from 'bun:test'
import { TestWriter } from './test-writer'

describe('TestWriter', () => {
	test('getLogs returns empty array when no messages logged', () => {
		const w = new TestWriter()
		expect(w.getLogs()).toEqual([])
	})

	test('getLogs returns messages in order after log()', () => {
		const w = new TestWriter()
		w.log('a')
		w.log('b')
		w.log('c')
		expect(w.getLogs()).toEqual(['a', 'b', 'c'])
	})

	test('getLogs returns a copy so mutating result does not affect internal buffer', () => {
		const w = new TestWriter()
		w.log('x')
		const logs = w.getLogs()
		logs.push('y')
		expect(w.getLogs()).toEqual(['x'])
	})

	test('clear empties the log buffer', () => {
		const w = new TestWriter()
		w.log('one')
		w.log('two')
		w.clear()
		expect(w.getLogs()).toEqual([])
	})

	test('log after clear appends to empty buffer', () => {
		const w = new TestWriter()
		w.log('before')
		w.clear()
		w.log('after')
		expect(w.getLogs()).toEqual(['after'])
	})

	test('preserves message content exactly (encoding)', () => {
		const w = new TestWriter()
		const msg = 'hello \n\t\u00a0'
		w.log(msg)
		expect(w.getLogs()).toHaveLength(1)
		expect(w.getLogs()[0]).toBe(msg)
	})
})
