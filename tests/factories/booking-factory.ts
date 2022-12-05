import faker from "@faker-js/faker";
import { prisma } from "@/config";
import { TicketStatus } from "@prisma/client";

export async function createBooking(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId,
    },
  });
}
