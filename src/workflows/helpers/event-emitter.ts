import { emitEventStep } from "@medusajs/medusa/core-flows"
import { WorkflowEventData } from "../../admin/types/workflow-events"

export const emitWorkflowEvent = (eventName: string, data: WorkflowEventData) => {
  return emitEventStep({
    eventName,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  })
}