/** Build a WhatsApp deep link with a prefilled message */
export function waLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/** Build a tel: link */
export function telLink(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}

/** Build a mailto: link */
export function mailtoLink(email: string, subject?: string): string {
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}

/** Build a Google Maps directions link from a maps URL or lat/lng */
export function mapsLink(mapsUrl: string): string {
  return mapsUrl;
}

/** Build a reservation WhatsApp message */
export function reservationWaMessage(
  locale: string,
  data: { name: string; date: string; time: string; party: number; notes?: string }
): string {
  if (locale === "ar") {
    return `مرحباً، أودّ حجز طاولة:\nالاسم: ${data.name}\nالتاريخ: ${data.date}\nالوقت: ${data.time}\nعدد الأشخاص: ${data.party}${data.notes ? `\nملاحظات: ${data.notes}` : ""}`;
  }
  if (locale === "en") {
    return `Hello, I'd like to reserve a table:\nName: ${data.name}\nDate: ${data.date}\nTime: ${data.time}\nParty size: ${data.party}${data.notes ? `\nNotes: ${data.notes}` : ""}`;
  }
  // fr default
  return `Bonjour, je souhaite réserver une table:\nNom: ${data.name}\nDate: ${data.date}\nHeure: ${data.time}\nNombre de personnes: ${data.party}${data.notes ? `\nNotes: ${data.notes}` : ""}`;
}

/** Build an order WhatsApp message */
export function orderWaMessage(
  locale: string,
  data: {
    name: string;
    phone: string;
    orderType: "dine_in" | "takeaway";
    tableOrTime?: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    notes?: string;
  }
): string {
  const itemsText = data.items
    .map((item) => `- ${item.quantity}x ${item.name} (${(item.price * item.quantity).toFixed(3)} DT)`)
    .join("\n");

  if (locale === "ar") {
    const typeLabel = data.orderType === "dine_in" ? "تناول في المطعم" : "استلام سفري";
    const detailLabel = data.orderType === "dine_in" ? `رقم الطاولة: ${data.tableOrTime || "غير محدد"}` : `وقت الاستلام: ${data.tableOrTime || "في أقرب وقت"}`;
    return `مرحباً، أودّ تقديم طلب جديد:\nالاسم: ${data.name}\nالهاتف: ${data.phone}\nنوع الطلب: ${typeLabel} (${detailLabel})\n\nالطلبات:\n${itemsText}\n\nالمجموع الإجمالي: ${data.total.toFixed(3)} DT${data.notes ? `\nملاحظات: ${data.notes}` : ""}`;
  }

  if (locale === "en") {
    const typeLabel = data.orderType === "dine_in" ? "Dine-in" : "Takeaway";
    const detailLabel = data.orderType === "dine_in" ? `Table: ${data.tableOrTime || "Not specified"}` : `Pickup time: ${data.tableOrTime || "ASAP"}`;
    return `Hello, I'd like to place an order:\nName: ${data.name}\nPhone: ${data.phone}\nOrder type: ${typeLabel} (${detailLabel})\n\nItems:\n${itemsText}\n\nTotal: ${data.total.toFixed(3)} DT${data.notes ? `\nNotes: ${data.notes}` : ""}`;
  }

  // fr default
  const typeLabel = data.orderType === "dine_in" ? "Sur place" : "À emporter";
  const detailLabel = data.orderType === "dine_in" ? `Table: ${data.tableOrTime || "Non précisée"}` : `Heure de retrait: ${data.tableOrTime || "Dès que possible"}`;
  return `Bonjour, je souhaite passer une commande:\nNom: ${data.name}\nTéléphone: ${data.phone}\nType: ${typeLabel} (${detailLabel})\n\nArticles:\n${itemsText}\n\nTotal: ${data.total.toFixed(3)} DT${data.notes ? `\nNotes: ${data.notes}` : ""}`;
}

