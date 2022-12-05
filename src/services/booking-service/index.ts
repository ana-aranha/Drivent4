import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { notFoundError, requestError, unauthorizedError } from "@/errors";
import { cannotListBookingError } from "@/errors/cannot-list-booking-error";
import bookingRepository from "@/repositories/booking-repository";
import { number } from "joi";

async function listBooking(userId: number) {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if (!enrollment) {
    throw notFoundError();
  }

  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

  if (!ticket || ticket.status === "RESERVED" || ticket.TicketType.isRemote || !ticket.TicketType.includesHotel) {
    throw cannotListBookingError();
  }
}

async function getBooking(userId: number) {
  await listBooking(userId);
  let result = {};
  const booking = await bookingRepository.findBooking(userId);

  if (booking) {
    result = {
      id: booking.id,
      Room: {
        id: booking.Room.id,
        name: booking.Room.name,
        capacity: booking.Room.capacity,
        hotelId: booking.Room.hotelId,
        createdAt: booking.Room.createdAt,
        updatedAt: booking.Room.updatedAt,
      },
    };
  }
  return result;
}

async function postBooking(userId: number, roomId: number) {
  if (!roomId) {
    throw requestError(403, "FORBIDEN");
  }

  await listBooking(userId);

  const hasBooking = await bookingRepository.findBooking(userId);

  const validRoomId = await bookingRepository.findRoom(roomId);

  if (!validRoomId) {
    throw notFoundError();
  }

  if (validRoomId.Booking.length >= validRoomId.capacity || hasBooking) {
    throw requestError(403, "FORBIDEN");
  }

  const booking = await bookingRepository.createBooking(userId, roomId);
  const result = {
    bookingId: booking.id,
  };
  return result;
}

async function putBooking(userId: number, roomId: number, bookingId: number) {
  if (!roomId) {
    throw requestError(403, "FORBIDEN");
  }

  await listBooking(userId);

  const hasBooking = await bookingRepository.findBooking(userId);

  const validRoomId = await bookingRepository.findRoom(roomId);

  if (!validRoomId) {
    throw notFoundError();
  }

  if (validRoomId.Booking.length >= validRoomId.capacity || !hasBooking) {
    throw requestError(403, "FORBIDEN");
  }

  const booking = await bookingRepository.updateBooking(bookingId, roomId);

  if (!booking) {
    throw unauthorizedError();
  }

  const result = {
    bookingId: booking.id,
  };

  return result;
}

const bookingService = {
  getBooking,
  postBooking,
  putBooking,
};

export default bookingService;
