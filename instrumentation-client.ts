import { initBotId } from 'botid/client/core'

if (process.env.NODE_ENV !== 'development') {
  initBotId({
    protect: [
      {
        path: '/api/chat',
        method: 'POST',
      },
    ],
  })
}
