import { ProductVariantDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type GetCustomPriceStepInput = {
  variant: ProductVariantDTO & {
    calculated_price?: {
      calculated_amount: number
    }
  }
  metadata?: Record<string, unknown>
}
//you calculate the custom price by multiplying the height and width to a 0.01 factor, which means that for every square unit of height and width, the price increases by 0.01 units. You add the variant's original price to the result.
const DIMENSION_PRICE_FACTOR = 0.01

export const getCustomPriceStep = createStep(
  "get-custom-price",
  async ({
    variant, metadata = {},
  }: GetCustomPriceStepInput) => {
    if (!variant.product?.metadata?.is_personalized) {
      return new StepResponse(variant.calculated_price?.calculated_amount || 0)
    }
    if (!metadata.height || !metadata.width) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Custom price requires width and height metadata to be set."
      )
    }
    const height = metadata.height as number
    const width = metadata.width as number

    const originalPrice = variant.calculated_price?.calculated_amount || 0
    const customPrice = originalPrice + (height * width * DIMENSION_PRICE_FACTOR)

    return new StepResponse(customPrice)
  }
)