import { createStep } from "@medusajs/framework/workflows-sdk"

export interface CartValidationInput {
  cart_id: string
  order_id?: string
}

export const validateCartInputStep = createStep(
  "validate-cart-input",
  async (input: CartValidationInput) => {
    // Validate cart_id
    if (!input.cart_id) {
      throw new Error("Cart ID is required")
    }

    if (typeof input.cart_id !== 'string' || input.cart_id.trim().length === 0) {
      throw new Error("Cart ID must be a non-empty string")
    }

    // Validate order_id if provided
    if (input.order_id && (typeof input.order_id !== 'string' || input.order_id.trim().length === 0)) {
      throw new Error("Order ID must be a non-empty string when provided")
    }

    // You can add more validation rules here:
    // - Check if cart exists
    // - Validate cart status
    // - Check permissions
    
    return {
      validated: true,
      cart_id: input.cart_id.trim(),
      order_id: input.order_id?.trim(),
    }
  }
)