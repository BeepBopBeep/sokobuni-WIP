/* This is the start of the original /route.ts 
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { smartCompleteCartWorkflow } from "../../../../../workflows/smart-complete-cart"

// Replace the default handler with your smart workflow
export const POST = async (
  req: MedusaRequest, 
  res: MedusaResponse) => {
  const cartId = req.params.id

  const { result } = await smartCompleteCartWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
    },
  })

  res.json(result)
}
/** This is the end of the original /route.ts */
/** This is a custom route.ts It passes items through the cart but fails at placeOrder for the tickets. For the other items, the customer receives an error 500 but the order is passed to the admin in an Unfulfilled state*/
/**import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { completeMixedCartWorkflow} from "../../../../../workflows/smart-complete-cart"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<MedusaResponse> 
{
  const cartId = req.params.id

  if (!cartId) {
    res.status(400).json({ 
      error: "Cart ID is required" 
    })
    return res
  }

  try {
    // Run your unified workflow
    const { result } = await completeMixedCartWorkflow(req.scope)
      .run({
        input: {
          cart_id: cartId,
        }
      })
res. send (result)
    // Return the same structure as the default complete cart endpoint
    if (result.order) {
      res.json({
        type: "order",
        order: result.order,
        // Include additional data if needed
        digital_product_order: result.digital_product_order,
        ticket_purchases: result.ticket_purchases,
      })
      return res
    } else {
      res.json({
        type: "order",
        cart: result.order, // Fallback to cart if order creation failed
      })
      return res
    }

  } catch (error) {
    console.error("Unified cart completion error:", error)
    res.status(500).json({
      error: "Failed to complete cart",
      details: error.message
    })
    return res
  }

}
  */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { completeMixedCartWorkflow } from "../../../../../workflows/smart-complete-cart"

 export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<MedusaResponse> {
  const cartId = req.params.id 

  if (!cartId) {
    return res.status(400).json({ 
      error: "Cart ID is required" 
    })
  }

  try {
    const { result } = await completeMixedCartWorkflow(req.scope)
    .run({
      input: {      
        cart_id: cartId }
    })
//res.send (result)
    // Only one response is sent
    if (result.order) {
      return res.status(200).json({
        type: "order",
        order: result.order,
        digital_product_order: result.digital_product_order,
        ticket_purchases: result.ticket_purchases,
        //redirect:(`.../confirmed`)
      })
    }

    return res.json({
      type: "order",
      cart: result.order ?? null, // fallback
    })
  } catch (error) {
    console.error("Unified cart completion error:", error)
    return res.status(500).json({
      error: "Failed to complete cart",
      details: error.message
    })
  }
}
