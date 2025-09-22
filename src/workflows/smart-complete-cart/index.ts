import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  completeCartWorkflow,
  useQueryGraphStep,
  createRemoteLinkStep,
  createOrderFulfillmentWorkflow,
  emitEventStep,
} from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"

// Digital Product recipe step (from the docs)
import { createDigitalProductOrderStep } from "../create-digital-product-order/steps/create-digital-product-order"

// Optionally re-exported constant for your module name
import { DIGITAL_PRODUCT_MODULE } from "../../modules/digital-product"

// Ticket Booking recipe Step
import { createTicketPurchasesStep, CreateTicketPurchasesStepInput } from "../steps/create-ticket-purchases"
import { TICKET_BOOKING_MODULE } from "../../modules/ticket-booking"

// Input: cart to complete
type CompleteMixedCartInput = {
  cart_id: string;
}

export const completeMixedCartWorkflow = createWorkflow(
  "complete-mixed-cart",
  (input: CompleteMixedCartInput) => {
    
    // Step 1: Complete the cart -> creates Medusa order
    const order = completeCartWorkflow.runAsStep({
      input: { id: input.cart_id },
    })

    // Now we always have an order_id
    const orderId = order.id

    // Step 2: Load the order with items + variants + digital/ticket links
    //I replaced data: order with data cartData and entity:order with entity:cart
    //Also replaced filters id:orderId with filters id:input.cart_id
    //Also added const cart =cartData[0]

    const { data: orders } = useQueryGraphStep
    ({
      entity: "order",
      fields: [
        "*",
        "id",
        "items.*",
        "items.variant.*",
        "items.variant.digital_product.*",
        "shipping_address.*",
        "items.variant.options.*",
        "items.variant.options.option.*",
        "items.variant.ticket_product_variant.*",
        "items.variant.ticket_product_variant.ticket_product.*",
        "items.metadata",
      ],
      filters: { id: order.id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "load-order-with-items" })
    const cart = transform({orders}, (data) => data.orders[0])
    

    // Step 3: Handle Digital Products

    //Changed orders to order and data.orders to data.order
    const itemsWithDigitalProducts = transform(
      { orders }, 
      (data) => data.orders[0].items.filter(
        (item) => item.variant?.digital_product !== undefined
      )
    )

    const digital_product_order = when(
      "has-digital-products",
      itemsWithDigitalProducts,
      (items) => items.length > 0
    ).then(() => {
      // Create Digital Product Order
      const { digital_product_order } = createDigitalProductOrderStep({
        items: itemsWithDigitalProducts,
      }).config({ name: "create-digital-product-order" })

      // Link Digital Product Order to Medusa Order
      createRemoteLinkStep([
        {
          [DIGITAL_PRODUCT_MODULE]: { 
            digital_product_order_id: digital_product_order.id 
          },
          [Modules.ORDER]: { 
            order_id: orderId 
          },
        },
      ]).config({ name: "link-digital-order" })

      // Create fulfillment for digital items
      //Changed order_id or order.id
      createOrderFulfillmentWorkflow.runAsStep({
        input: {
          order_id: order.id,
          items: transform(
            { itemsWithDigitalProducts }, 
            ({ itemsWithDigitalProducts }) =>
              itemsWithDigitalProducts.map((item: any) => ({ 
                id: item.id, 
                quantity: item.quantity 
              }))
          ),
        },
      })

      // Emit event for downstream handling (email delivery workflow/subscriber)
      emitEventStep({
        eventName: "digital_product_order.created",
        data: { 
          id: digital_product_order.id,
          order_id: orderId, 
          },
      }).config({ name: "emit-digital-order-created" })

      return digital_product_order
    })

    // Step 4: Handle Ticket Booking Products
    

    //Changed orders to order and data.orders to data.order
    const itemsWithTicketProducts = transform(
      { orders },
      (data) => data.orders[0].items.filter(
        (item) => item.variant?.ticket_product_variant !== undefined
      )
    )

    const ticket_purchases = when(
      "has-ticket-products",
      itemsWithTicketProducts,
      (items) => items.length > 0
    ).then(() => {
      //Added run the ticket purchases creation step
     /* createTicketPurchasesStep
      .runAsStep({
        input: {
          order_id:order.id,
          cart,
        } satisfies CreateTicketPurchasesStepInput,
      })*/
      // Get cart data for ticket creation
      const { data: carts } = useQueryGraphStep({
        entity: "cart",
        fields: ["id", "items.*"],
        filters: { id: input.cart_id },
        options: { throwIfKeyNotFound: true }
      }).config({ name: "get-cart-for-tickets" })

      
      // Create ticket purchases
      const ticketPurchases = createTicketPurchasesStep({
        order_id: order.id,
        cart: carts[0],
      } as unknown as CreateTicketPurchasesStepInput).config({ 
        name: "create-ticket-purchases" 
      })

      

      // Link ticket purchases to the order
      const linkData = transform(
        { ticketPurchases },
        (data) => {
          return data.ticketPurchases.map((purchase: any) => ({
            [TICKET_BOOKING_MODULE]: {
              ticket_purchase_id: purchase.id
            },
            [Modules.ORDER]: {
              order_id: orderId,
            },
          }))
        }
      )

      // Create remote links
      createRemoteLinkStep(linkData).config({ 
        name: "link-ticket-purchases" 
      })

      // Emit event for follow-up actions (QR codes, emails, etc.)
      emitEventStep({
        eventName: "ticket_purchases.created",
        data: { orderId, ticketPurchases },
      }).config({ name: "emit-ticket-purchases-created" })

      return ticketPurchases
    })

    // Step 5: Refetch and return the final order details
    const { data: finalOrder } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "currency_code",
        "email",
        "customer.*",
        "billing_address.*",
        "shipping_address.*",
        "payment_collections.*",
        "items.*",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
        "discount_total",
        "created_at",
        "updated_at",
      ],
      filters: { id: orderId },
    }).config({ name: "refetch-final-order" })

    // Step 6: Return enriched response
    return new WorkflowResponse({
      order: finalOrder[0],
      digital_product_order,
      ticket_purchases,
    })
  }
)