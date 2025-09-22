export interface WorkflowConfig {
  enableParallelProcessing: boolean
  maxRetries: number
  timeoutMs: number
  enableDetailedLogging: boolean
  digitalProductsEnabled: boolean
  ticketBookingEnabled: boolean
}

export const getWorkflowConfig = (): WorkflowConfig => {
  return {
    enableParallelProcessing: process.env.ENABLE_PARALLEL_PROCESSING !== 'false',
    maxRetries: parseInt(process.env.WORKFLOW_MAX_RETRIES || '3'),
    timeoutMs: parseInt(process.env.WORKFLOW_TIMEOUT_MS || '30000'),
    enableDetailedLogging: process.env.ENABLE_DETAILED_LOGGING === 'true',
    digitalProductsEnabled: process.env.DIGITAL_PRODUCTS_ENABLED !== 'false',
    ticketBookingEnabled: process.env.TICKET_BOOKING_ENABLED !== 'false',
  }
}