import { Router } from "express";
import { authenticateToken } from "@/middlewares";
import { getBookings, postBooking, putBooking } from "@/controllers";

const bookingRouter = Router();

bookingRouter.all("/*", authenticateToken).get("", getBookings).post("", postBooking).put("/:bookingId", putBooking);

export { bookingRouter };
