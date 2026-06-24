import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import webhooksRouter from "./webhooks";
import leadsRouter from "./leads";
import campaignsRouter from "./campaigns";
import resultsRouter from "./results";
import dashboardRouter from "./dashboard";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(webhooksRouter);
router.use(leadsRouter);
router.use(campaignsRouter);
router.use(resultsRouter);
router.use(dashboardRouter);
router.use(searchRouter);

export default router;
