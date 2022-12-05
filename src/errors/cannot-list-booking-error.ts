import { ApplicationError } from "@/protocols";

export function cannotListBookingError(): ApplicationError {
  return {
    name: "CannotListBookingError",
    message: "Cannot list booking!",
  };
}
