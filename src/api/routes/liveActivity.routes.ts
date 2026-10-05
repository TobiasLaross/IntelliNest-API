import { Router } from 'express'
import liveActivity from '../handler/handler.liveActivity'

const router = Router()

router.route('/live-activity/register').post(liveActivity.handleRegister)
router.route('/live-activity/unregister').post(liveActivity.handleUnregister)
router.route('/live-activity/media-state').post(liveActivity.handleMediaState)

export default router
