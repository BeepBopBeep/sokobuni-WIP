// src/steps/custom-query-step.ts
import { 
  createStep, 
  StepResponse, 
  StepExecutionContext 
} from "@medusajs/framework/workflows-sdk"

export interface QueryStepInput {
  entity: string
  fields: string[]
  filters: Record<string, any>
  options?: Record<string, any>
}

/**
 * Creates a reusable query step with proper StepResponse handling
 * Follows Medusa's official workflow patterns
 */
export const createQueryStep = (stepName: string) => {
  return createStep(
    "custom-step-name",
    async (input: QueryStepInput, { container }: StepExecutionContext) => {
      try {
        const query = container.resolve("query")
        const { data } = await query.graph(input)
        
        // Return StepResponse with data as both output and compensation data
        return new StepResponse(data, data)
      } catch (error) {
        // Handle query errors appropriately
        throw error
      }
    },
    async (data, { container }) => {
      // Compensation function for read operations is usually a no-op
      // Since we're just querying data, there's nothing to roll back
      console.log(`Compensating ${stepName} - read operation, nothing to undo`)
    }
  )
}

// Alternatively, create specific step instances:
export const getOrderStep = createQueryStep("get-order-step")
export const getCartStep = createQueryStep("get-cart-step")
export const getProductStep = createQueryStep("get-product-step")