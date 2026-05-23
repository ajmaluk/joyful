import { onRequestOptions as __api_ai___route___ts_onRequestOptions } from "/Users/uk/Development/joyful/functions/api/ai/[[route]].ts"
import { onRequest as __api_ai___route___ts_onRequest } from "/Users/uk/Development/joyful/functions/api/ai/[[route]].ts"

export const routes = [
    {
      routePath: "/api/ai/:route*",
      mountPath: "/api/ai",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_ai___route___ts_onRequestOptions],
    },
  {
      routePath: "/api/ai/:route*",
      mountPath: "/api/ai",
      method: "",
      middlewares: [],
      modules: [__api_ai___route___ts_onRequest],
    },
  ]