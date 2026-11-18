import ContactsPage from "@/components/contacts-page";
import NotificationDrawer from "@/components/notification-drawer";
import SearchPalette from "@/components/search-palette";

export const metadata = {
  title: "Liên hệ | ChatHub AI",
  description: "Quản lý danh sách khách hàng và liên hệ đa kênh.",
};

export default function ContactsRoute() {
  return <><ContactsPage /><SearchPalette /><NotificationDrawer /></>;
}
