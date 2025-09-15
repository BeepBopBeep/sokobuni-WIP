import { 
  defineMiddlewares,
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { createDigitalProductsSchema } from "./validation-schemas"
import multer from "multer"
import { PostVendorCreateSchema } from "./vendors/route"
import { AdminCreateProduct } from "@medusajs/medusa/api/admin/products/validators"
import { PostInvoiceConfigSchema } from "./admin/invoice-config/route"
import { PostCustomPriceSchema } from "./store/variants/[id]/price/route"
import { 
  PostAddCustomLineItemSchema,
} from "./store/carts/[id]/line-items-custom/route"

const upload = multer({ storage: multer.memoryStorage() })

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/invoice-config",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(PostInvoiceConfigSchema),
      ],
    },
    {         
      matcher: "/store/variants/:id/price",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(PostCustomPriceSchema),
      ],
    },
    {
      matcher: "/store/carts/:id/line-items-custom",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(PostAddCustomLineItemSchema),
      ],
    },
    {
      matcher: "/admin/digital-products",
      method: "POST",
      middlewares: [
        validateAndTransformBody(createDigitalProductsSchema),
      ],
    },
    {
      matcher: "/admin/digital-products/upload/**",
      method: "POST",
      middlewares: [
        upload.array("files"),
      ],
    },
    {
       matcher: "/vendors",
      method: ["POST"],
      middlewares: [
        authenticate("vendor", ["session", "bearer"], {
          allowUnregistered: true,
        }),
        validateAndTransformBody(PostVendorCreateSchema),
      ],
    },
    {
      matcher: "/vendors/*",
      middlewares: [
      authenticate("vendor", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/vendors/products",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(AdminCreateProduct),
      ],

    },
  ],
})