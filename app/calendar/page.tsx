import CalendarPage from "@/components/calendar-page";
import NotificationDrawer from "@/components/notification-drawer";
import SearchPalette from "@/components/search-palette";

export const metadata = {
  title: "Lịch hẹn | ChatHub AI",
  description: "Theo dõi lịch hẹn và quản lý khung giờ đặt lịch.",
};

export default function CalendarRoute() {
  return <><CalendarPage /><SearchPalette /><NotificationDrawer /></>;
}
