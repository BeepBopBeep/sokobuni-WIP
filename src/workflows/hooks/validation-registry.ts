import { addToCartWorkflow } from "@medusajs/medusa/core-flows"

type ValidationHandler = (params: any, context: any) => Promise<void>

class CartValidationRegistry {
  private validators: ValidationHandler[] = []

  register(validator: ValidationHandler) {
    this.validators.push(validator)
  }

  async validateAll(params: any, context: any) {
    for (const validator of this.validators) {
      await validator(params, context)
    }
  }
}

export const cartValidationRegistry = new CartValidationRegistry()

// Register the single hook handler
addToCartWorkflow.hooks.validate(
  async (params, context) => {
    await cartValidationRegistry.validateAll(params, context)
  }
)