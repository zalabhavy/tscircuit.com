import { withRouteSpec } from "fake-snippets-api/lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["POST"],
  auth: "session",
  jsonBody: z
    .object({
      package_release_id: z.string().optional(),
      circuit_json: z.any().optional(),
      vendor_name: z.string(),
    })
    .superRefine((data, ctx) => {
      if (data.circuit_json && data.package_release_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "You must provide either circuit_json or package_release_id, but not both.",
        })
      }
      if (!data.circuit_json && !data.package_release_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "You must provide either circuit_json or package_release_id.",
        })
      }
    }),

  jsonResponse: z.object({
    order_quote_id: z.string().optional(),
    error: z
      .object({
        error_code: z.string(),
        message: z.string(),
      })
      .optional(),
  }),
})(async (req, ctx) => {
  const { package_release_id, vendor_name, circuit_json } = req.jsonBody

  if (package_release_id) {
    // check package release exists
    const packageRelease = ctx.db.getPackageReleaseById(package_release_id)
    if (!packageRelease) {
      return ctx.json(
        {
          error: {
            error_code: "package_release_not_found",
            message: "Package release not found",
          },
        },
        { status: 404 },
      )
    }
  }

  const orderQuoteId = ctx.db.addOrderQuote({
    account_id: ctx.auth.account_id,
    package_release_id,
    vendor_name,
  })

  return ctx.json({
    order_quote_id: orderQuoteId,
  })
})
