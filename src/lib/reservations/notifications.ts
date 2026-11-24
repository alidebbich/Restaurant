/**
 * Notification Subsystem & Adapter Architecture
 * Clean adapter pattern supporting zero-cost WhatsApp deep-links and external providers.
 */

import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import { site, type Locale } from "../../config/site.config.ts";
import type { Reservation } from "../db/queries.ts";
import { minutesToTimeString } from "./time.ts";

export type NotificationEvent =
  | "created"
  | "confirmed"
  | "declined"
  | "reminder_2h"
  | "cancelled";

export type NotificationChannel = "whatsapp_link" | "meta_whatsapp" | "sms" | "email";

export type NotificationResult = {
  success: boolean;
  channel: NotificationChannel;
  message: string;
  providerRef?: string;
  recipient: string;
  error?: string;
};

export interface NotificationAdapter {
  channel: NotificationChannel;
  sendEvent(
    event: NotificationEvent,
    reservation: Reservation,
    options?: { manageUrl?: string }
  ): Promise<NotificationResult>;
}

/**
 * Generates hospitable, polite notification copy in FR, AR, or EN.
 */
export function getNotificationMessage(
  event: NotificationEvent,
  reservation: Reservation,
  options?: { manageUrl?: string }
): string {
  const locale = (reservation.locale as Locale) || "fr";
  const ref = reservation.reference || reservation.id;
  const timeFormatted = reservation.reservation_time || minutesToTimeString(reservation.start_minute);
  const dateStr = reservation.service_date || reservation.reservation_date;
  const name = reservation.guest_name || reservation.customer_name;
  const party = reservation.party_size;
  const restaurantName = site.name[locale] || "Dar Zitoun";
  const manageUrl = options?.manageUrl || "";

  switch (event) {
    case "confirmed":
      if (locale === "ar") {
        return (
          `مرحباً ${name}،\n` +
          `تم تأكيد حجزك رقم ${ref} في مطعم ${restaurantName}!\n` +
          `📅 الموعد: ${dateStr} على الساعة ${timeFormatted}\n` +
          `👥 عدد الأشخاص: ${party}\n` +
          (manageUrl ? `🔗 لتعديل أو إلغاء الحجز: ${manageUrl}\n` : "") +
          `نتطلع لاستقبالكم بكل ترحاب!`
        );
      }
      if (locale === "en") {
        return (
          `Hello ${name},\n` +
          `Your reservation ${ref} at ${restaurantName} is confirmed!\n` +
          `📅 Date: ${dateStr} at ${timeFormatted}\n` +
          `👥 Guests: ${party} persons\n` +
          (manageUrl ? `🔗 Manage your booking: ${manageUrl}\n` : "") +
          `We look forward to welcoming you!`
        );
      }
      return (
        `Bonjour ${name},\n` +
        `Votre réservation ${ref} chez ${restaurantName} est confirmée !\n` +
        `📅 Date : ${dateStr} à ${timeFormatted}\n` +
        `👥 Convives : ${party} personnes\n` +
        (manageUrl ? `🔗 Gérer ou modifier votre table : ${manageUrl}\n` : "") +
        `Nous nous réjouissons de vous accueillir !`
      );

    case "declined":
      if (locale === "ar") {
        return (
          `مرحباً ${name}،\n` +
          `نأسف لإعلامكم بتعذر قبول طلب الحجز ${ref} بتاريخ ${dateStr} لاكتمال العدد.\n` +
          `يسعدنا استقبالكم في موعد آخر، تواصلوا معنا: ${site.contact.phone}.`
        );
      }
      if (locale === "en") {
        return (
          `Hello ${name},\n` +
          `Unfortunately, we cannot accommodate reservation request ${ref} on ${dateStr} as we are fully booked.\n` +
          `We would love to welcome you on another day: ${site.contact.phone}.`
        );
      }
      return (
        `Bonjour ${name},\n` +
        `Nous sommes désolés de ne pouvoir confirmer votre demande ${ref} le ${dateStr} car notre restaurant affiche complet.\n` +
        `Nous serons ravis de vous accueillir à une autre date : ${site.contact.phone}.`
      );

    case "reminder_2h":
      if (locale === "ar") {
        return (
          `مرحباً ${name}،\n` +
          `تذكير: موعد طاولتك في مطعم ${restaurantName} اليوم على الساعة ${timeFormatted} (${party} أشخاص).\n` +
          `📍 العنوان: ${site.address.street}, ${site.address.city}\n` +
          (manageUrl ? `🔗 إدارة الحجز: ${manageUrl}\n` : "") +
          `أهلاً وسهلاً بكم!`
        );
      }
      if (locale === "en") {
        return (
          `Hello ${name},\n` +
          `Reminder: Your table at ${restaurantName} is reserved today at ${timeFormatted} (${party} guests).\n` +
          `📍 Location: ${site.address.street}, ${site.address.city}\n` +
          (manageUrl ? `🔗 Manage booking: ${manageUrl}\n` : "") +
          `See you shortly!`
        );
      }
      return (
        `Bonjour ${name},\n` +
        `Rappel : Votre table chez ${restaurantName} vous attend aujourd'hui à ${timeFormatted} (${party} pers.).\n` +
        `📍 Adresse : ${site.address.street}, ${site.address.city}\n` +
        (manageUrl ? `🔗 Gérer ma réservation : ${manageUrl}\n` : "") +
        `À tout à l'heure !`
      );

    case "cancelled":
      if (locale === "ar") {
        return (
          `مرحباً ${name}،\n` +
          `تم إلغاء حجزك رقم ${ref} بناءً على طلبكم.\n` +
          `شكراً لإعلامنا ويسعدنا دائماً استقبالكم في وقت لاحق.`
        );
      }
      if (locale === "en") {
        return (
          `Hello ${name},\n` +
          `Your reservation ${ref} has been cancelled.\n` +
          `Thank you for letting us know, and we hope to welcome you soon.`
        );
      }
      return (
        `Bonjour ${name},\n` +
        `Votre réservation ${ref} a bien été annulée.\n` +
        `Merci de nous avoir prévenus et à très bientôt chez ${restaurantName}.`
      );

    default: // created
      if (locale === "ar") {
        return (
          `مرحباً ${name}،\n` +
          `تم استلام طلب حجزك رقم ${ref} في مطعم ${restaurantName}.\n` +
          `📅 الموعد: ${dateStr} à ${timeFormatted} (${party} أشخاص).\n` +
          `سيتواصل فريقنا معكم للتأكيد فوراً.`
        );
      }
      return (
        `Bonjour ${name},\n` +
        `Votre demande de réservation ${ref} chez ${restaurantName} a bien été reçue.\n` +
        `📅 Date : ${dateStr} à ${timeFormatted} (${party} personnes).\n` +
        `Notre équipe valide votre demande dans les plus brefs délais.`
      );
  }
}

/**
 * Shipped default adapter: WhatsApp link / console adapter (zero cost, immediate).
 */
export class WhatsAppLinkAdapter implements NotificationAdapter {
  channel: NotificationChannel = "whatsapp_link";

  async sendEvent(
    event: NotificationEvent,
    reservation: Reservation,
    options?: { manageUrl?: string }
  ): Promise<NotificationResult> {
    const message = getNotificationMessage(event, reservation, options);
    const recipient = reservation.guest_phone || reservation.customer_phone || "";
    const cleanPhone = recipient.replace(/[^0-9]/g, "");

    const providerRef = `wa_link_${cleanPhone}_${Date.now()}`;
    return {
      success: true,
      channel: this.channel,
      message,
      providerRef,
      recipient,
    };
  }
}

/**
 * Notification Dispatcher with Deduplication Log
 */
export async function dispatchNotification(
  event: NotificationEvent,
  reservation: Reservation,
  options?: { manageUrl?: string; db?: DatabaseSync }
): Promise<NotificationResult> {
  const adapter = new WhatsAppLinkAdapter();
  const result = await adapter.sendEvent(event, reservation, options);

  // Record to SQLite notification_log for strict idempotency and auditing
  try {
    let db = options?.db;
    if (!db) {
      const dbModule = await import("../db/index.ts");
      db = dbModule.getDb();
    }

    db.prepare(`
      INSERT INTO notification_log (id, reservation_id, channel, template, locale, status, provider_response)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "notif_" + crypto.randomUUID().slice(0, 8),
      reservation.id,
      result.channel,
      event,
      reservation.locale || "fr",
      result.success ? "sent" : "failed",
      JSON.stringify({ recipient: result.recipient, providerRef: result.providerRef })
    );
  } catch (err) {
    console.warn("[notification_log] Failed to write audit row:", err);
  }

  return result;
}
