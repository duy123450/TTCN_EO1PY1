const requestParts = new Set(['body', 'query', 'params'])

const validateRequest = (
    schemas,
    { message = 'Request validation failed', includeErrors = true } = {},
) => {
    if (
        !schemas ||
        typeof schemas !== 'object' ||
        Object.entries(schemas).some(
            ([part, schema]) =>
                !requestParts.has(part) ||
                typeof schema?.safeParse !== 'function',
        )
    ) {
        throw new TypeError('Validation schemas must target body, query, or params')
    }
    if (
        (typeof message !== 'string' && typeof message !== 'function') ||
        typeof includeErrors !== 'boolean'
    ) {
        throw new TypeError('Invalid request validation error options')
    }

    return (req, res, next) => {
        const validated = {}

        for (const [part, schema] of Object.entries(schemas)) {
            const result = schema.safeParse(req[part])
            if (!result.success) {
                const errorMessage =
                    typeof message === 'function'
                        ? message({ req, part, error: result.error })
                        : message
                const response = {
                    success: false,
                    message: errorMessage,
                }
                if (includeErrors) {
                    response.errors = result.error.issues.map((issue) => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                    }))
                }
                return res.status(400).json(response)
            }

            validated[part] = result.data
        }

        req.validated = { ...req.validated, ...validated }
        return next()
    }
}

export default validateRequest
