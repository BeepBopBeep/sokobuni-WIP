export interface WorkflowEventData {
  order_id: string
  cart_id: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface DigitalProductEventData extends WorkflowEventData {
  digital_product_order_id: string
  items_count: number
  items: Array<{ id: string; quantity: number }>
}

export interface TicketPurchaseEventData extends WorkflowEventData {
  purchase_count: number
  ticket_purchases: Array<{ id: string; ticket_id: string }>
}

export interface WorkflowCompletionEventData extends WorkflowEventData {
  digital_items_count: number
  ticket_items_count: number
  regular_items_count: number
  total_amount: number
  customer_email: string
  processing_time_ms: number
}