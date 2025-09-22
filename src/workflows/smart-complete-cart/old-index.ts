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
  completeOrderWorkflow,
} from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"

// Digital Product recipe step (from the docs)
import createDigitalProductOrderStep from "../create-digital-product-order/steps/create-digital-product-order"
// Optionally re-exported constant for your module name
import { DIGITAL_PRODUCT_MODULE } from "../../modules/digital-product"

//Ticket Booking recipe Step
import {createTicketPurchasesStep,  CreateTicketPurchasesStepInput } from "../steps/create-ticket-purchases"
import { TICKET_BOOKING_MODULE } from "../../modules/ticket-booking"

// If you use personalized products with custom pricing, you should have added them
// beforehand using a custom add-to-cart workflow from the personalized recipe.
// This completion flow assumes items are already in the cart with any custom prices.

// Input: cart to complete
type CompleteMixedCartInput = {
  cart_id: string;
}
/**This guard bit is to guard against completed carts*/
export const completeMixedCartWorkflow = createWorkflow(
  "complete-mixed-cart",
  (input: CompleteMixedCartInput) => 
    {
      /** const { data: guardCarts } = useQueryGraphStep({
          entity: "cart",
          fields: ["id","completed_at"],
          filters: { id: input.cart_id},
        }).config({name: "check-cart completed"})
      
      /** This is the former step one which used order_id 
      // --- Step 1: Resolve order id from cart or input ---
    let orderId: string

    if (input.order_id) {
      orderId = input.order_id
    } else if (input.cart_id) {
    // 1) Complete the cart -> creates Medusa order
    const { id: order_id } = completeCartWorkflow.runAsStep({
      input: { id: input.cart_id },
    }) 
  }
  else {
      throw new Error("Either cart_id or order_id must be provided")
    }
    */
   //Step 1 using cart_id as a string in the beginning and then downstream using order_id 
const order = completeCartWorkflow.runAsStep({
  input: {id :input.cart_id},
})
//Now we always have an order_id
const orderId = order.id
  // Creates the order. [Digital: Step 13] 
    // https://docs.medusajs.com/resources/recipes/digital-products/examples/standard#step-13-create-cart-completion-flow-for-digital-products
// 2) Load the order with items + variants + digital links (to detect digital products)
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "items.",
        "items.variant.",
        "items.variant.digital_product.",
        "shipping_address.*",
        "items.variant.options.*",
        "items.variant.options.option.*",
        "items.variant.ticket_product_variant.*",
        "items.variant.ticket_product_variant.ticket_product.*",
        "items.metadata",
      ],
      /* I am replacing this to only use orderId  filters: input.cart_id ? { id: input.cart_id } : { id: "__skip__" }, */
      filters: {id:orderId},
      options: { throwIfKeyNotFound: true },
    }).config({name: "data-order-loader" })
     // [Digital: Create workflow → QueryGraph usage]
    // https://docs.medusajs.com/resources/recipes/digital-products/examples/standard#create-createdigitalproductorderworkflow

    // 3) Filter items that are digital
    const itemsWithDigitalProducts = transform({ orders }, ( data ) =>
      data.orders[0].items.filter((item) => item.variant.digital_product !== undefined)
    )

    // 4) Conditionally create Digital Product Order, link, fulfill, and emit event
    const digital_product_order = when(
      "create-digital-product-order-condition",
      itemsWithDigitalProducts,
      (itemsWithDigitalProducts) => itemsWithDigitalProducts.length > 0
    )
      .then(() => {
        const orderItems =
        orders && orders[0] && Array.isArray(orders[0].items)
          ? orders[0].items.filter(
              (item) =>
                item &&
                item.variant &&
                item.variant.digital_product !== undefined
            )
          : []
        // 4.a) Create Digital Product Order
        const { digital_product_order, } = createDigitalProductOrderStep({
          items: orders[0].items as any,
        }).config({name: "digital-product-order-create-step"}) // [Digital: createDigitalProductOrderStep]
        // https://docs.medusajs.com/resources/recipes/digital-products/examples/standard#step-13-create-cart-completion-flow-for-digital-products

        // 4.b) Link Digital Product Order to Medusa Order
        createRemoteLinkStep([
          {
            [DIGITAL_PRODUCT_MODULE]: { digital_product_order_id: digital_product_order.id },
            [Modules.ORDER]: { order_id: orderId },
          },
        ]).config({name:"digital-order-regular-order-link"}) // [Digital: link step via createRemoteLinkStep]
        // https://docs.medusajs.com/resources/recipes/digital-products/examples/standard#create-createdigitalproductorderworkflow
// 4.c) Create fulfillment for digital items
        createOrderFulfillmentWorkflow.runAsStep({
        
          input: {
            order_id: orderId,
            items: transform({ itemsWithDigitalProducts }, ({ itemsWithDigitalProducts }) =>
              itemsWithDigitalProducts.map((i: any) => ({ id: i.id, quantity: i.quantity }))
            ),
          },
        }) // [Digital: createOrderFulfillmentWorkflow]
        // https://docs.medusajs.com/resources/recipes/digital-products/examples/standard#create-createdigitalproductorderworkflow

        // 4.d) Emit event for downstream handling (email delivery workflow/subscriber)
        emitEventStep({
          eventName: "digital_product_order.created",
          data: { id: digital_product_order.id },
        }).config({name:"digital-product-order-emitter"}) // [Digital: emitEventStep]
        // https://docs.medusajs.com/resources/recipes/digital-products/examples/standard#create-createdigitalproductorderworkflow

        return digital_product_order
      })

   

    // 4) Ticket booking branch (based on Ticket Booking recipe)
    // Detect items that correspond to ticketed variants per your recipe’s data shape.
    // Typically you’ll have a link/metadata to identify tickets; then create bookings.
    const {data: carts} = useQueryGraphStep({
      entity:"cart",
      fields:["id", "items.*"],
      filters:{id:input.cart_id},
      options:{ throwIfKeyNotFound:true}
    }).config({name:"detect-ticket-query"})
    
    //4.a) Create ticket purchases for ticket products
    const ticketPurchases= createTicketPurchasesStep({
      order_id:orderId,
      cart:carts[0],
    } as unknown as CreateTicketPurchasesStepInput).config({name:"create-ticket-purchase-step"})
    //4.b. Link ticket purchases to the order
    const linkData = transform(
      {order:{id: orderId},ticketPurchases },
      (data) => {
        return data.ticketPurchases.map((purchase:any) => ({
          [TICKET_BOOKING_MODULE]: {
            ticket_purchase_id: purchase.id
          },
          [Modules.ORDER]:{
            order_id:orderId,
          },
        }))
      }
    )

  // 4.c Create remote links
  createRemoteLinkStep(linkData)
  
  //5. Refetch and return the final order details
  const { data: refetchedOrder } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "currency_code",
        "email",
        "customer.",
        "billing_address.",
        "payment_collections.",
        "items.",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
        "discount_total",
        "created_at",
        "updated_at",
      ],
      filters: { id: orderId },
    }).config({ name: "refetched-order" }) 

  // 5.b) Emit event for follow-up actions (QR codes, emails, etc.)
  emitEventStep({
    eventName: "ticket_purchases.created",
    data: { orderId },
  }).config({name:"ticket-purchase-created-emitter"})

  //return refetchedOrder
  return new WorkflowResponse({
      order: refetchedOrder[0],
      digital_product_order,
      ticket_purchases:ticketPurchases,
      cart:orders[0]
    })
    // 5) Personalized products
    // Personalized items should already be added using your custom add-to-cart flow
    // that sets unit_price and metadata before completion. No extra step needed here
    // at completion time. [Personalized: custom add-to-cart]
    // https://docs.medusajs.com/resources/recipes/personalized-products/example#step-5-implement-custom-add-to-cart-logic

    // You can "when(...).then(...)" here to create ticket records, link them,
    // and emit an event like "ticket_order.created" for delivery emails.
    // The knowledge sources do not include ticket-specific steps.

    // 6) Return enriched order and optional digital_product_order
    /**
     * return new WorkflowResponse({
      order: refetchedOrder[0],
      digital_product_order,
      ticket_purchases:ticketPurchases,
    })
     */
  
  
  }
)
