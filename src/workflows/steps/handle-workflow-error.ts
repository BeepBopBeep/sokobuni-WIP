import { createStep } from "@medusajs/framework/workflows-sdk"

export interface WorkflowErrorInput {
  error: Error
  context: {
    cart_id?: string
    order_id?: string
    step_name: string
    timestamp: Date
  }
}

export const handleWorkflowErrorStep = createStep(
  "handle-workflow-error",
  async (input: WorkflowErrorInput) => {
    // Log the error with context
    console.error("Workflow Error:", {
      message: input.error.message,
      stack: input.error.stack,
      context: input.context,
    })

    // You can add additional error handling here:
    // - Send notifications
    // - Update order status
    // - Trigger rollback procedures
    // - Log to external service

    // For now, we'll just log and re-throw
    // You can customize this based on your needs
    throw input.error
  }
)