import { Router } from 'express'
import liveActivity from '../handler/handler.liveActivity'
import { requireSecret } from '../middleware/requireSecret'

const router = Router()

router.use('/live-activity', requireSecret)

router.route('/live-activity/register').post(liveActivity.handleRegister)
router.route('/live-activity/unregister').post(liveActivity.handleUnregister)
router.route('/live-activity/media-state').post(liveActivity.handleMediaState)

export default router
