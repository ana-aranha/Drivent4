import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares";
import bookingService from "@/services/booking-service";
import httpStatus from "http-status";

export async function getBookings(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;

  try {
    const booking = await bookingService.getBooking(Number(userId));
    return res.status(httpStatus.OK).send(booking);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }
    return res.sendStatus(httpStatus.PAYMENT_REQUIRED);
  }
}

export async function postBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const { roomId } = req.body;

  try {
    const newBooking = await bookingService.postBooking(Number(userId), Number(roomId));

    return res.status(httpStatus.OK).send(newBooking);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }
    if (error.name === "CannotListBookingError") {
      return res.sendStatus(httpStatus.PAYMENT_REQUIRED);
    }
    return res.sendStatus(httpStatus.FORBIDDEN);
  }
}

export async function putBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const { bookingId } = req.params;
  const { roomId } = req.body;

  try {
    const newRoom = await bookingService.putBooking(Number(userId), Number(roomId), Number(bookingId));

    return res.status(httpStatus.OK).send(newRoom);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }
    if (error.name === "CannotListBookingError") {
      return res.sendStatus(httpStatus.PAYMENT_REQUIRED);
    }
    return res.sendStatus(httpStatus.FORBIDDEN);
  }
}
