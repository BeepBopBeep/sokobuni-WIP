import { QueryContext } from "@medusajs/framework/utils"
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { getCustomPriceStep, GetCustomPriceStepInput } from "./steps/get-custom-price"

type WorkflowInput = {
  variant_id: string
  region_id: string
  metadata?: Record<string, unknown>
}

export const getCustomPriceWorkflow = createWorkflow(
  "get-custom-price-workflow",
  (input: WorkflowInput) => {
    const customPriceFetchRegionsStep = useQueryGraphStep({
      entity: "region",
      fields: ["currency_code"],
      filters: {
        id: input.region_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "custom-price-fetch-regions" })

    const { data: regions } = customPriceFetchRegionsStep

    const customPriceFetchVariantsStep = useQueryGraphStep({
      entity: "variant",
      fields: [
        "*",
        "calculated_price.*",
        "product.*",
      ],
      filters: {
        id: input.variant_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
      context: {
        calculated_price: QueryContext({
          currency_code: regions[0].currency_code,
        }),
      },
    }).config({ name: "custom-price-fetch-variants" })

    const { data: variants } = customPriceFetchVariantsStep

    const price = getCustomPriceStep({
      variant: variants[0],
      metadata: input.metadata,
    } as GetCustomPriceStepInput)

    return new WorkflowResponse(price)
  }
)