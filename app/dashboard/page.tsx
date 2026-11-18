import InboxDashboard from "@/components/inbox-dashboard";
import SearchPalette from "@/components/search-palette";

export const metadata = {
  title: "Tin nhắn | ChatHub AI",
  description: "Quản lý hội thoại khách hàng trong ChatHub AI.",
};

export default function DashboardPage() {
  return <><InboxDashboard /><SearchPalette /></>;
}
