import { 
  defineMiddlewares,
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { createDigitalProductsSchema } from "./validation-schemas"
import multer from "multer"
import { PostVendorCreateSchema } from "./vendors/route"
import { AdminCreateProduct } from "@medusajs/medusa/api/admin/products/validators"

const upload = multer({ storage: multer.memoryStorage() })

export default defineMiddlewares({
  routes: [
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