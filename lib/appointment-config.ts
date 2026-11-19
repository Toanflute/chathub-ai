export const appointmentServices = [
  { name: "Tư vấn sản phẩm", durationMinutes: 60 },
  { name: "Chăm sóc khách hàng", durationMinutes: 30 },
  { name: "Tư vấn đơn hàng", durationMinutes: 30 },
] as const;

export const appointmentStaff = ["Ai cũng được", "Admin", "Nhân viên 1"] as const;
export const appointmentSlots = ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] as const;
export const appointmentStatuses = ["pending", "confirmed", "completed", "cancelled"] as const;

export type AppointmentServiceName = (typeof appointmentServices)[number]["name"];
export type AppointmentStaffName = (typeof appointmentStaff)[number];
export type AppointmentStatus = (typeof appointmentStatuses)[number];
