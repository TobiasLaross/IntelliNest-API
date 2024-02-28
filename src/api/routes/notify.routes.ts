import { Router } from 'express'
import notify from '../handler/handler.notify'

const router = Router()

router
  .route('/notify').post(notify.handlePostNotify)

export default router
