import assert from 'node:assert/strict'
import test from 'node:test'
import validateRequest from '../middleware/validateRequest.js'
import { availabilityBodySchema } from './availabilitySchema.js'

const makeBody = (availability) => ({
    week_start: '2026-11-16',
    availability,
})

test('malformed availability entries return validation failures', () => {
    const invalidEntries = [
        null,
        {},
        'invalid',
        42,
        {
            day_of_week: 1,
            is_off: false,
            start_time: 'invalid',
            end_time: '09:00',
        },
    ]

    for (const entry of invalidEntries) {
        let result
        assert.doesNotThrow(() => {
            result = availabilityBodySchema.safeParse(makeBody([entry]))
        })
        assert.equal(result.success, false)
    }
})

test('malformed availability entries retain the HTTP 400 response contract', () => {
    let statusCode
    let response
    const middleware = validateRequest(
        { body: availabilityBodySchema },
        {
            message: ({ error }) => error.issues[0]?.message,
            includeErrors: false,
        },
    )
    const req = { body: makeBody([null]) }
    const res = {
        status(code) {
            statusCode = code
            return this
        },
        json(body) {
            response = body
            return body
        },
    }

    middleware(req, res, () => {
        assert.fail('Invalid availability should not reach the next handler')
    })

    assert.equal(statusCode, 400)
    assert.deepEqual(response, {
        success: false,
        message: 'Each availability entry must contain valid fields only',
    })
})

test('valid intervals and OFF entries retain normalized database times', () => {
    const result = availabilityBodySchema.safeParse(
        makeBody([
            {
                day_of_week: 1,
                start_time: '09:00',
                end_time: '11:00',
                is_off: false,
            },
            {
                day_of_week: 1,
                start_time: '11:00:00',
                end_time: '12:30:00',
                is_off: false,
            },
            {
                day_of_week: 2,
                start_time: null,
                end_time: null,
                is_off: true,
            },
        ]),
    )

    assert.equal(result.success, true)
    assert.deepEqual(result.data.availability, [
        {
            day_of_week: 1,
            start_time: '09:00:00',
            end_time: '11:00:00',
            is_off: false,
        },
        {
            day_of_week: 1,
            start_time: '11:00:00',
            end_time: '12:30:00',
            is_off: false,
        },
        {
            day_of_week: 2,
            start_time: null,
            end_time: null,
            is_off: true,
        },
    ])
})

test('overlapping intervals and OFF/working conflicts remain invalid', () => {
    const overlapping = availabilityBodySchema.safeParse(
        makeBody([
            {
                day_of_week: 1,
                start_time: '09:00',
                end_time: '11:00',
                is_off: false,
            },
            {
                day_of_week: 1,
                start_time: '10:00',
                end_time: '12:00',
                is_off: false,
            },
        ]),
    )
    const offConflict = availabilityBodySchema.safeParse(
        makeBody([
            {
                day_of_week: 1,
                start_time: null,
                end_time: null,
                is_off: true,
            },
            {
                day_of_week: 1,
                start_time: '09:00',
                end_time: '10:00',
                is_off: false,
            },
        ]),
    )

    assert.equal(overlapping.success, false)
    assert.equal(offConflict.success, false)
})
