import OrdersPage from "@/components/orders-page";
import NotificationDrawer from "@/components/notification-drawer";
import SearchPalette from "@/components/search-palette";

export const metadata = {
  title: "Đơn hàng | ChatHub AI",
  description: "Theo dõi và quản lý đơn hàng khách hàng.",
};

export default function OrdersRoute() {
  return <><OrdersPage /><SearchPalette /><NotificationDrawer /></>;
}
