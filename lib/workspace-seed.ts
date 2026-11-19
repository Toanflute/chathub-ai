import { prisma } from "@/lib/prisma";

const contactSeeds = [
  { id: "contact-bui-gia-huy", name: "Bùi Gia Huy", initials: "BH", avatar: "bg-rose-100 text-rose-700", email: "huy.bui@example.com", orderNumber: "#DH-240910", channel: "Chat Plugin", balance: 0, address: "Hue, Việt Nam", connected: false, tag: "Khách hàng", assignee: "Chưa gán", activity: 3, createdAt: new Date("2026-11-18T08:00:00Z") },
  { id: "contact-hoang-bao-ngoc", name: "Hoàng Bảo Ngọc", initials: "HN", avatar: "bg-orange-100 text-orange-700", email: "ngoc.hoang@example.com", phone: "0977333444", orderNumber: "#DH-240882", channel: "Telegram Bot", balance: 20000, address: "Nha Trang, Việt Nam", connected: true, tag: "VIP", assignee: "Admin", activity: 8, createdAt: new Date("2026-11-17T08:00:00Z") },
  { id: "contact-vu-anh-tuan", name: "Vũ Anh Tuấn", initials: "VT", avatar: "bg-emerald-100 text-emerald-700", email: "tuan.vu@example.com", phone: "0967222333", channel: "Facebook", balance: 0, address: "Cần Thơ, Việt Nam", connected: true, tag: "Khách hàng", assignee: "Admin", activity: 6, createdAt: new Date("2026-11-15T08:00:00Z") },
  { id: "contact-nguyen-thu-ha", name: "Nguyễn Thu Hà", initials: "NH", avatar: "bg-violet-100 text-violet-700", email: "ha.nguyen@example.com", phone: "0984567890", orderNumber: "#DH-240731", channel: "Facebook", balance: 125000, address: "Hà Nội, Việt Nam", connected: true, tag: "Khách hàng", assignee: "Admin", activity: 5, createdAt: new Date("2026-11-10T08:00:00Z") },
  { id: "contact-tran-minh-anh", name: "Trần Minh Anh", initials: "MA", avatar: "bg-sky-100 text-sky-700", email: "anh.tran@example.com", phone: "0965678901", orderNumber: "#DH-240690", channel: "Chat Plugin", balance: 50000, address: "Đà Nẵng, Việt Nam", connected: true, tag: "Lead", assignee: "Chưa gán", activity: 7, createdAt: new Date("2026-11-01T08:00:00Z") },
  { id: "contact-pham-hoang-long", name: "Phạm Hoàng Long", initials: "PL", avatar: "bg-teal-100 text-teal-700", email: "long.pham@example.com", phone: "0933456789", orderNumber: "#DH-240756", channel: "Telegram Bot", balance: 0, address: "TP. Hồ Chí Minh, Việt Nam", connected: true, tag: "Khách hàng", assignee: "Admin", activity: 4, createdAt: new Date("2026-10-10T08:00:00Z") },
  { id: "contact-le-quynh-chi", name: "Lê Quỳnh Chi", initials: "QC", avatar: "bg-amber-100 text-amber-700", email: "chi.le@example.com", phone: "0976789012", orderNumber: "#DH-240612", channel: "Facebook", balance: 80000, address: "Hải Phòng, Việt Nam", connected: false, tag: "Lead", assignee: "Chưa gán", activity: 2, createdAt: new Date("2026-09-10T08:00:00Z") },
  { id: "contact-dang-minh-khoa", name: "Đặng Minh Khoa", initials: "MK", avatar: "bg-fuchsia-100 text-fuchsia-700", email: "khoa.dang@example.com", phone: "0917890123", channel: "Chat Plugin", balance: 0, address: "Huế, Việt Nam", connected: true, tag: "Khách hàng", assignee: "Admin", activity: 1, createdAt: new Date("2026-08-03T08:00:00Z") },
];

const conversationSeeds = [
  { id: "conversation-bui-gia-huy", contactId: "contact-bui-gia-huy", channel: "WEB_CHAT", status: "open", assignee: "Admin" },
  { id: "conversation-hoang-bao-ngoc", contactId: "contact-hoang-bao-ngoc", channel: "TELEGRAM", status: "open", assignee: "Admin" },
  { id: "conversation-pham-hoang-long", contactId: "contact-pham-hoang-long", channel: "MESSENGER", status: "open", assignee: "Admin" },
  { id: "conversation-nguyen-thu-ha", contactId: "contact-nguyen-thu-ha", channel: "MESSENGER", status: "open", assignee: "Chưa gán" },
  { id: "conversation-tran-minh-anh", contactId: "contact-tran-minh-anh", channel: "MESSENGER", status: "open", assignee: "Admin" },
  { id: "conversation-le-quynh-chi", contactId: "contact-le-quynh-chi", channel: "WEB_CHAT", status: "closed", assignee: "Chưa gán" },
];

const inboxV2ContactSeeds = [
  { id: "contact-do-khanh-linh", name: "Đỗ Khánh Linh", initials: "ĐL", avatar: "bg-teal-100 text-teal-700", email: "linh.do@example.com", phone: "0912345678", channel: "Messenger", balance: 0, address: "Đà Lạt, Việt Nam", connected: true, tag: "VIP", assignee: "Admin", activity: 2, createdAt: new Date("2026-09-10T08:00:00Z") },
  { id: "contact-tran-minh-quan", name: "Trần Minh Quân", initials: "TQ", avatar: "bg-orange-100 text-orange-700", email: "quan.tran@example.com", phone: "0909123456", orderNumber: "#DH-240644", channel: "Telegram Bot", balance: 0, address: "Hà Nội, Việt Nam", connected: true, tag: "Khách hàng", assignee: "Admin", activity: 5, createdAt: new Date("2026-09-10T08:00:00Z") },
  { id: "contact-le-thi-mai", name: "Lê Thị Mai", initials: "LM", avatar: "bg-emerald-100 text-emerald-700", email: "mai.le@example.com", phone: "0938123456", channel: "Facebook", balance: 0, address: "Cần Thơ, Việt Nam", connected: true, tag: "Lead", assignee: "Chưa gán", activity: 4, createdAt: new Date("2026-09-10T08:00:00Z") },
];

const inboxV2ConversationSeeds = [
  { id: "conversation-do-khanh-linh", contactId: "contact-do-khanh-linh", channel: "WEB_CHAT", status: "open", assignee: "Admin", metadata: { labels: ["Bot", "Khách VIP"], ad: false, botEnabled: true, team: "Đội chăm sóc", priority: "Bình thường" } },
  { id: "conversation-tran-minh-quan", contactId: "contact-tran-minh-quan", channel: "TELEGRAM", status: "open", assignee: "Admin", metadata: { labels: ["Chờ đơn hàng"], ad: true, botEnabled: true, team: "Đội bán hàng", priority: "Cao" } },
  { id: "conversation-le-thi-mai", contactId: "contact-le-thi-mai", channel: "MESSENGER", status: "pending", assignee: "Chưa gán", metadata: { labels: ["Bot", "Hỏi giá sỉ"], ad: false, botEnabled: true, team: "Chưa phân công", priority: "Bình thường" } },
  { id: "conversation-vu-anh-tuan", contactId: "contact-vu-anh-tuan", channel: "MESSENGER", status: "resolved", assignee: "Admin", metadata: { labels: [], ad: true, botEnabled: false, team: "Đội chăm sóc", priority: "Bình thường" } },
];

const inboxV2MetadataSeeds: Record<string, { labels: string[]; ad: boolean; botEnabled: boolean; team: string; priority: string; channel: string }> = {
  "conversation-bui-gia-huy": { labels: ["Bot"], ad: false, botEnabled: true, team: "Đội chăm sóc", priority: "Bình thường", channel: "WEB_CHAT" },
  "conversation-hoang-bao-ngoc": { labels: ["Bot"], ad: false, botEnabled: true, team: "Đội bán hàng", priority: "Bình thường", channel: "TELEGRAM" },
  "conversation-pham-hoang-long": { labels: ["Gấp", "Khiếu nại"], ad: true, botEnabled: true, team: "Đội chăm sóc", priority: "Gấp", channel: "MESSENGER" },
  "conversation-nguyen-thu-ha": { labels: [], ad: true, botEnabled: true, team: "Đội chăm sóc", priority: "Cao", channel: "MESSENGER" },
};

const channelConnectionSeeds = [
  { id: "channel-facebook-main", code: "ch-fb-01", name: "Fanpage Chính", platform: "facebook" },
  { id: "channel-telegram-sales", code: "ch-tg-01", name: "Telegram Bot Bán Hàng", platform: "telegram_bot" },
  { id: "channel-website-main", code: "ch-web-01", name: "Website Chat", platform: "chat_plugin" },
  { id: "channel-zalo-main", code: "ch-zalo-01", name: "Zalo OA", platform: "zalo_oa" },
].map((channel) => ({ ...channel, status: "needs_config", enabled: true }));

const orderSeeds = [
  { id: "order-emo-or-7", code: "#EMO-OR-7", productName: "Áo thun cotton in logo cửa hàng", quantity: 2, category: "GOODS-TSHIRT", workflow: "Workflow bán tự động", total: 500000, currency: "Credits", status: "pending", placedAt: new Date("2026-09-10T22:00:00+07:00"), note: "Khách hẹn giao lại sáng mai, vui lòng gọi trước khi giao.", processingCode: "demo-or-7", deliveryType: "Nội dung dùng chung", contactId: "contact-bui-gia-huy" },
  { id: "order-emo-or-8", code: "#EMO-OR-8", productName: "Áo polo thêu logo", quantity: 1, category: "GOODS-POLO", workflow: "Workflow bán tự động", total: 450000, currency: "Credits", status: "pending", placedAt: new Date("2026-09-11T09:15:00+07:00"), note: "Khách muốn nhận vào giờ hành chính.", processingCode: "demo-or-8", deliveryType: "Nội dung dùng chung", contactId: "contact-hoang-bao-ngoc" },
  { id: "order-emo-or-9", code: "#EMO-OR-9", productName: "Túi canvas in theo yêu cầu", quantity: 2, category: "GOODS-BAG", workflow: "Workflow bán tự động", total: 320000, currency: "Credits", status: "pending", placedAt: new Date("2026-09-11T10:30:00+07:00"), note: "Đóng gói riêng từng sản phẩm.", processingCode: "demo-or-9", deliveryType: "Nội dung dùng chung", contactId: "contact-vu-anh-tuan" },
  { id: "order-emo-or-10", code: "#EMO-OR-10", productName: "Áo thun cotton in logo cửa hàng", quantity: 3, category: "GOODS-TSHIRT", workflow: "Workflow bán tự động", total: 800000, currency: "Credits", status: "processing", placedAt: new Date("2026-09-12T11:00:00+07:00"), note: "Đang đóng gói.", processingCode: "demo-or-10", deliveryType: "Nội dung dùng chung", contactId: "contact-nguyen-thu-ha" },
  { id: "order-emo-or-11", code: "#EMO-OR-11", productName: "Mũ lưỡi trai thêu chữ", quantity: 1, category: "GOODS-CAP", workflow: "Workflow bán tự động", total: 250000, currency: "Credits", status: "processing", placedAt: new Date("2026-09-12T14:20:00+07:00"), note: "Đã xác nhận thông tin nhận hàng.", processingCode: "demo-or-11", deliveryType: "Nội dung dùng chung", contactId: "contact-tran-minh-anh" },
  { id: "order-emo-or-12", code: "#EMO-OR-12", productName: "Áo hoodie in hình", quantity: 1, category: "GOODS-HOODIE", workflow: "Workflow bán tự động", total: 500000, currency: "Credits", status: "delivered", placedAt: new Date("2026-09-13T08:10:00+07:00"), note: "Khách đã xác nhận nhận hàng.", processingCode: "demo-or-12", deliveryType: "Nội dung dùng chung", contactId: "contact-pham-hoang-long" },
  { id: "order-emo-or-13", code: "#EMO-OR-13", productName: "Tất cotton cổ ngắn", quantity: 2, category: "GOODS-SOCKS", workflow: "Workflow bán tự động", total: 130000, currency: "Credits", status: "delivered", placedAt: new Date("2026-09-13T10:45:00+07:00"), note: "Giao thành công.", processingCode: "demo-or-13", deliveryType: "Nội dung dùng chung", contactId: "contact-le-quynh-chi" },
  { id: "order-emo-or-14", code: "#EMO-OR-14", productName: "Áo thun cotton in logo cửa hàng", quantity: 2, category: "GOODS-TSHIRT", workflow: "Workflow bán tự động", total: 690000, currency: "Credits", status: "delivered", placedAt: new Date("2026-09-14T13:05:00+07:00"), note: "Khách đã nhận đủ hàng.", processingCode: "demo-or-14", deliveryType: "Nội dung dùng chung", contactId: "contact-dang-minh-khoa" },
  { id: "order-emo-or-15", code: "#EMO-OR-15", productName: "Áo khoác gió in logo", quantity: 1, category: "GOODS-JACKET", workflow: "Workflow bán tự động", total: 450000, currency: "Credits", status: "delivered", placedAt: new Date("2026-09-15T16:40:00+07:00"), note: "Giao thành công.", processingCode: "demo-or-15", deliveryType: "Nội dung dùng chung", contactId: "contact-hoang-bao-ngoc" },
  { id: "order-emo-or-16", code: "#EMO-OR-16", productName: "Áo polo thêu logo", quantity: 1, category: "GOODS-POLO", workflow: "Workflow bán tự động", total: 400000, currency: "Credits", status: "cancelled", placedAt: new Date("2026-09-16T18:25:00+07:00"), note: "Khách yêu cầu huỷ trước khi giao.", processingCode: "demo-or-16", deliveryType: "Nội dung dùng chung", contactId: "contact-nguyen-thu-ha" },
];

const oldNotificationDate = new Date(Date.now() - 69 * 24 * 60 * 60 * 1000);
const notificationSeeds = [
  { id: "notification-website-disconnected", channel: "Website cmsnt.co", message: "Kênh Website cmsnt.co đang mất kết nối. Hệ thống vẫn tự thử lại, nhưng nếu lâu không lên thì cần được kiểm tra.", createdAt: oldNotificationDate },
  { id: "notification-fanpage-disconnected", channel: "Fanpage CMSNT", message: "Kênh Fanpage CMSNT đang mất kết nối. Hệ thống vẫn tự thử lại, nhưng nếu lâu không lên thì cần được kiểm tra.", createdAt: oldNotificationDate },
  { id: "notification-telegram-disconnected", channel: "Telegram Bot bán hàng", message: "Kênh Telegram Bot bán hàng đang mất kết nối. Hệ thống vẫn tự thử lại, nhưng nếu lâu không lên thì cần được kiểm tra.", createdAt: oldNotificationDate },
];

export async function ensureWorkspaceSeed() {
  await prisma.$transaction(async (transaction) => {
    const initialized = await transaction.appState.createMany({
      data: [{ key: "workspace-seed-v1" }],
      skipDuplicates: true,
    });
    if (initialized.count > 0) {
      await transaction.contact.createMany({ data: contactSeeds, skipDuplicates: true });
      await transaction.conversation.createMany({ data: conversationSeeds, skipDuplicates: true });
      await transaction.message.createMany({
        data: [
          { id: "message-bui-1", conversationId: "conversation-bui-gia-huy", role: "user", content: "Chào shop, mình vừa đặt hàng và muốn hỏi thêm về thời gian giao dự kiến ạ.", createdAt: new Date(Date.now() - 180_000) },
          { id: "message-bui-2", conversationId: "conversation-bui-gia-huy", role: "agent", content: "Dạ, shop kiểm tra đơn hàng giúp bạn ngay nhé. Bạn chờ shop một chút ạ!", createdAt: new Date(Date.now() - 120_000) },
          { id: "message-bui-3", conversationId: "conversation-bui-gia-huy", role: "user", content: "Mình muốn hỏi thêm về đơn hàng mới đặt ạ", createdAt: new Date(Date.now() - 60_000) },
          { id: "message-ngoc-1", conversationId: "conversation-hoang-bao-ngoc", role: "user", content: "Shop ơi, sản phẩm này còn màu xanh không?", createdAt: new Date(Date.now() - 90_000) },
          { id: "message-long-1", conversationId: "conversation-pham-hoang-long", role: "user", content: "Cảm ơn bạn, mình nhận được hàng rồi nhé!", createdAt: new Date(Date.now() - 300_000) },
          { id: "message-ha-1", conversationId: "conversation-nguyen-thu-ha", role: "user", content: "Đơn của mình bị thiếu một sản phẩm", createdAt: new Date(Date.now() - 240_000) },
          { id: "message-anh-1", conversationId: "conversation-tran-minh-anh", role: "user", content: "Cho mình xin thông tin về chính sách đổi trả", createdAt: new Date(Date.now() - 360_000) },
          { id: "message-chi-1", conversationId: "conversation-le-quynh-chi", role: "user", content: "Mình đã chuyển khoản rồi, shop kiểm tra giúp nhé", createdAt: new Date(Date.now() - 420_000) },
        ],
        skipDuplicates: true,
      });
      await transaction.notification.createMany({ data: notificationSeeds, skipDuplicates: true });
    }

    const inboxV2Initialized = await transaction.appState.createMany({
      data: [{ key: "workspace-inbox-v2" }],
      skipDuplicates: true,
    });
    if (inboxV2Initialized.count > 0) {
      await transaction.contact.createMany({ data: inboxV2ContactSeeds, skipDuplicates: true });
      await transaction.conversation.createMany({ data: inboxV2ConversationSeeds, skipDuplicates: true });
      await transaction.message.createMany({
        data: [
          { id: "message-linh-1", conversationId: "conversation-do-khanh-linh", role: "user", content: "Shop ơi, sản phẩm này còn hàng không ạ?", createdAt: new Date(Date.now() - 150_000) },
          { id: "message-quan-1", conversationId: "conversation-tran-minh-quan", role: "user", content: "Mình muốn kiểm tra giúp tình trạng đơn hàng với ạ.", createdAt: new Date(Date.now() - 180_000) },
          { id: "message-quan-2", conversationId: "conversation-tran-minh-quan", role: "user", content: "Mã đơn của mình là #DH-240644.", createdAt: new Date(Date.now() - 90_000) },
          { id: "message-mai-1", conversationId: "conversation-le-thi-mai", role: "user", content: "Shop có giá tốt hơn nếu lấy số lượng lớn không?", createdAt: new Date(Date.now() - 120_000) },
          { id: "message-mai-2", conversationId: "conversation-le-thi-mai", role: "user", content: "Mình cần tham khảo giá sỉ ạ.", createdAt: new Date(Date.now() - 60_000) },
          { id: "message-tuan-1", conversationId: "conversation-vu-anh-tuan", role: "agent", content: "Dạ, shop đã hỗ trợ xong yêu cầu của anh.", createdAt: new Date(Date.now() - 300_000) },
        ],
        skipDuplicates: true,
      });
      const existingConversations = await transaction.conversation.findMany({
        where: { id: { in: Object.keys(inboxV2MetadataSeeds) } },
        select: { id: true, metadata: true },
      });
      for (const conversation of existingConversations) {
        if (conversation.metadata === null) {
          await transaction.conversation.update({
            where: { id: conversation.id },
            data: {
              metadata: inboxV2MetadataSeeds[conversation.id],
              channel: inboxV2MetadataSeeds[conversation.id].channel,
            },
          });
        }
      }
    }

    const channelConnectionsInitialized = await transaction.appState.createMany({
      data: [{ key: "channel-connections-v1" }],
      skipDuplicates: true,
    });
    if (channelConnectionsInitialized.count > 0) {
      await transaction.channelConnection.createMany({ data: channelConnectionSeeds, skipDuplicates: true });
    }

    const channelConnections = await transaction.channelConnection.findMany({
      select: { id: true, platform: true },
    });
    const inboxChannelPlatforms: Record<string, string> = {
      MESSENGER: "facebook",
      WEB_CHAT: "chat_plugin",
      TELEGRAM: "telegram_bot",
      ZALO: "zalo_oa",
    };
    for (const [inboxPlatform, accountPlatform] of Object.entries(inboxChannelPlatforms)) {
      const channelConnection = channelConnections.find((channel) => channel.platform === accountPlatform);
      if (channelConnection) {
        await transaction.conversation.updateMany({
          where: { channel: inboxPlatform, channelConnectionId: null },
          data: { channelConnectionId: channelConnection.id },
        });
      }
    }

    const ordersInitialized = await transaction.appState.createMany({
      data: [{ key: "orders-seed-v1" }],
      skipDuplicates: true,
    });
    if (ordersInitialized.count > 0) {
      const contacts = await transaction.contact.findMany({ select: { id: true } });
      const contactIds = new Set(contacts.map((contact) => contact.id));
      await transaction.order.createMany({
        data: orderSeeds.filter((order) => contactIds.has(order.contactId)),
        skipDuplicates: true,
      });
    }
  });
}
