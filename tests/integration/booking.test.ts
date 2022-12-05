import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import { TicketStatus } from "@prisma/client";
import e from "express";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import {
  createEnrollmentWithAddress,
  createUser,
  createTicketType,
  createTicket,
  createPayment,
  generateCreditCardData,
  createTicketTypeWithHotel,
  createTicketTypeRemote,
  createHotel,
  createRoomWithHotelId,
  createBooking,
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 402 when user ticket is remote ", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      //Hoteis no banco

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
    });

    it("should respond with status 404 when user has no enrollment ", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const ticketType = await createTicketTypeRemote();

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 with booking id and Room information", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.OK);

      expect(response.body).toEqual({
        id: createdBooking.id,
        Room: {
          id: createdRoom.id,
          name: createdRoom.name,
          capacity: createdRoom.capacity,
          hotelId: createdRoom.hotelId,
          createdAt: createdRoom.createdAt.toISOString(),
          updatedAt: createdRoom.updatedAt.toISOString(),
        },
      });
    });

    it("should respond with status 200 and an empty object", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({});
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 when roomId is not present in body", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);
      await createTicketType();

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({});

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when user doesnt have enrollment yet", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const ticketType = await createTicketType();
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server
        .post("/booking")
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 404 when ticket is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketType();
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server
        .post("/booking")
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
    });

    it("should respond with status 404 when is an invalid Room", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 10 });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when user has booking already", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server
        .post("/booking")
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 and with bookingId when capacity is full", async () => {
      const user = await createUser();
      const seconduser = await createUser();
      const thirduser = await createUser();
      const fourthuser = await createUser();
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const fourthtoken = await generateValidToken(fourthuser);
      const ticketType = await createTicketTypeWithHotel();
      const fourthenrollment = await createEnrollmentWithAddress(fourthuser);
      const fourthticket = await createTicket(fourthenrollment.id, ticketType.id, TicketStatus.PAID);
      const fourthpayment = await createPayment(fourthticket.id, ticketType.price);

      const beforeCount = await prisma.booking.count();
      await createBooking(user.id, createdRoom.id);
      await createBooking(seconduser.id, createdRoom.id);
      await createBooking(thirduser.id, createdRoom.id);

      const fourthresponse = await server
        .post("/booking")
        .set("Authorization", `Bearer ${fourthtoken}`)
        .send({ roomId: createdRoom.id });

      expect(fourthresponse.status).toEqual(httpStatus.FORBIDDEN);

      const afterCount = await prisma.booking.count();

      expect(beforeCount).toEqual(0);
      expect(afterCount).toEqual(3);
    });

    it("should respond with status 200 and with bookingId when capacity máx-limit", async () => {
      const user = await createUser();
      const seconduser = await createUser();
      const thirduser = await createUser();
      const ticketType = await createTicketTypeWithHotel();
      const thirdtoken = await generateValidToken(thirduser);
      const thirdenrollment = await createEnrollmentWithAddress(thirduser);
      const thirdticket = await createTicket(thirdenrollment.id, ticketType.id, TicketStatus.PAID);
      const thirdpayment = await createPayment(thirdticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const beforeCount = await prisma.booking.count();
      await createBooking(user.id, createdRoom.id);
      await createBooking(seconduser.id, createdRoom.id);

      const thirdresponse = await server
        .post("/booking")
        .set("Authorization", `Bearer ${thirdtoken}`)
        .send({ roomId: createdRoom.id });

      expect(thirdresponse.status).toEqual(httpStatus.OK);
      expect(thirdresponse.body).toEqual({
        bookingId: expect.any(Number),
      });

      const afterCount = await prisma.booking.count();

      expect(beforeCount).toEqual(0);
      expect(afterCount).toEqual(3);
    });

    it("should respond with status 200 and with bookingId when capacity  nominal limit", async () => {
      const user = await createUser();
      const seconduser = await createUser();
      const ticketType = await createTicketTypeWithHotel();
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const secondtoken = await generateValidToken(seconduser);
      const secondenrollment = await createEnrollmentWithAddress(seconduser);
      const secondticket = await createTicket(secondenrollment.id, ticketType.id, TicketStatus.PAID);
      const secondpayment = await createPayment(secondticket.id, ticketType.price);

      const beforeCount = await prisma.booking.count();
      await createBooking(user.id, createdRoom.id);

      const secondresponse = await server
        .post("/booking")
        .set("Authorization", `Bearer ${secondtoken}`)
        .send({ roomId: createdRoom.id });

      expect(secondresponse.status).toEqual(httpStatus.OK);
      expect(secondresponse.body).toEqual({
        bookingId: expect.any(Number),
      });

      const afterCount = await prisma.booking.count();

      expect(beforeCount).toEqual(0);
      expect(afterCount).toEqual(2);
    });

    it("should respond with status 200 and with bookingId when capacity min-limit", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server
        .post("/booking")
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({
        bookingId: expect.any(Number),
      });
    });

    it("should insert a new booking in the database", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const beforeCount = await prisma.booking.count();

      await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      const afterCount = await prisma.booking.count();

      expect(beforeCount).toEqual(0);
      expect(afterCount).toEqual(1);
    });
  });
});

describe("PUT /booking/:bookingId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put("/booking/1");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 when roomId is not present in body", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);
      await createTicketType();

      const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({});

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when user doesnt have enrollment yet", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const ticketType = await createTicketType();
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server
        .put("/booking/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 404 when ticket is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketType();
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server
        .put("/booking/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
    });

    it("should respond with status 403 when user doesn't have booking already", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server
        .put("/booking/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when is an invalid Room", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server
        .put(`/booking/${createdBooking.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: 10 });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 and with bookingId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server
        .put(`/booking/${createdBooking.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: createdRoom.id });

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({
        bookingId: expect.any(Number),
      });
    });
  });
});
