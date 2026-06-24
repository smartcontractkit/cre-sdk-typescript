import { expect, test } from 'bun:test'
import { globalHostBindingsSchema } from './host-bindings'

test('JS host bindings contract', () => {
	const keys = Object.keys(globalHostBindingsSchema.shape).sort()
	expect(keys).toMatchSnapshot()
})
