    import { Router } from "express";
    import publicRoutes from "./public.routes.js";
    import contestantsRoutes from "./contestants.routes.js";
    import examRoutes from "./exam.routes.js";
    import adminRoutes from "./admin.routes.js";
    import controlRoutes from "./control.routes.js";

    const router = Router();

    router.get("/health", (_req, res) => res.json({ ok: true }));
    router.use(publicRoutes);
    router.use("/contestants", contestantsRoutes);
    router.use("/exam", examRoutes);
    router.use("/admin", adminRoutes);
    router.use("/control", controlRoutes);  

    export default router;
