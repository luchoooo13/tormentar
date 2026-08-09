/**
 * Web Push notifications
 * Permite mandar notificaciones push reales (las que aparecen aunque
 * el navegador este cerrado, iguales a las de una app nativa) a
 * cualquier dispositivo que haya activado "Notificaciones push" en
 * Configuracion. Usa el estandar Web Push (VAPID + Push API), sin
 * depender de Firebase ni de ningun servicio externo de pago.
 *
 * La app no tiene login obligatorio, asi que no se guarda "de quien"
 * es cada suscripcion: se manda a TODOS los dispositivos suscriptos
 * (pensado para uso personal/familiar, no multi-usuario).
 */
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { pushSubscriptions, type InsertPushSubscription } from "../drizzle/schema";
import { ENV } from "./_core/env";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    throw new Error(
      "Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY para mandar notificaciones push."
    );
  }
  webpush.setVapidDetails(ENV.vapidSubject, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  vapidConfigured = true;
}

export function getVapidPublicKey(): string {
  return ENV.vapidPublicKey;
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * Guarda (o actualiza, si el endpoint ya existia) una suscripcion.
 */
export async function saveSubscription(sub: PushSubscriptionInput): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Push] No se pudo guardar la suscripcion: base de datos no disponible");
    return;
  }

  const values: InsertPushSubscription = {
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  };

  await db
    .insert(pushSubscriptions)
    .values(values)
    .onDuplicateKeyUpdate({ set: { p256dh: values.p256dh, auth: values.auth } });
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export type PushPayload = {
  title: string;
  body: string;
  severity?: string;
  alertId?: string;
  url?: string;
};

/**
 * Manda la notificacion a todas las suscripciones guardadas. Si
 * alguna ya no es valida (410/404: el usuario desinstalo el navegador,
 * revoco el permiso, etc.) se borra sola de la base para no seguir
 * intentando enviarle en el futuro.
 */
export async function sendPushToAll(
  payload: PushPayload
): Promise<{ sent: number; removed: number; failed: number }> {
  ensureVapidConfigured();

  const db = await getDb();
  if (!db) return { sent: 0, removed: 0, failed: 0 };

  const subs = await db.select().from(pushSubscriptions);
  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await deleteSubscription(sub.endpoint);
          removed++;
        } else {
          failed++;
          console.warn("[Push] Error enviando a una suscripcion:", error?.message ?? error);
        }
      }
    })
  );

  return { sent, removed, failed };
}
