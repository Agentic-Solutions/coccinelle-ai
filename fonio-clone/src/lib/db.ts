// ═══════════════════════════════════════
// CLIENT D1 - Accès à la base de données Cloudflare
// ═══════════════════════════════════════
// D1 est accessible via le binding dans wrangler.toml
// En production : env.DB (injecté automatiquement par Cloudflare)
// En dev local : wrangler lance un D1 local automatiquement

import { getRequestContext } from '@cloudflare/next-on-pages'
import type { CloudflareEnv } from '@/types/cloudflare'

// Récupérer le binding D1 depuis le contexte Cloudflare
export function getDB(): D1Database {
  const { env } = getRequestContext()
  return (env as unknown as CloudflareEnv).DB
}

// Récupérer le binding R2 depuis le contexte Cloudflare
export function getR2(): R2Bucket {
  const { env } = getRequestContext()
  return (env as unknown as CloudflareEnv).R2
}

// Récupérer une variable d'environnement avec typage strict
export function getEnv<K extends keyof CloudflareEnv>(key: K): CloudflareEnv[K] {
  const { env } = getRequestContext()
  const cfEnv = env as unknown as CloudflareEnv
  return cfEnv[key]
}

// ═══════════════════════════════════════
// HELPERS D1 - Fonctions utilitaires
// ═══════════════════════════════════════

// Type pour les paramètres de requête D1 (valeurs scalaires uniquement)
// Note : D1/SQLite n'accepte pas les booléens natifs, utiliser 0/1 (number) à la place
export type QueryParam = string | number | null

// Générer un ID unique (UUID sans tirets)
export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

// Exécuter une requête SELECT qui retourne plusieurs lignes
export async function queryAll<T>(
  sql: string,
  params: QueryParam[] = []
): Promise<T[]> {
  const db = getDB()
  const result = await db.prepare(sql).bind(...params).all<T>()
  return result.results ?? []
}

// Exécuter une requête SELECT qui retourne une seule ligne
export async function queryOne<T>(
  sql: string,
  params: QueryParam[] = []
): Promise<T | null> {
  const db = getDB()
  const result = await db.prepare(sql).bind(...params).first<T>()
  return result ?? null
}

// Exécuter une requête INSERT/UPDATE/DELETE
export async function execute(
  sql: string,
  params: QueryParam[] = []
): Promise<D1Result> {
  const db = getDB()
  return await db.prepare(sql).bind(...params).run()
}

// Exécuter plusieurs requêtes en batch (transaction)
export async function batch(
  statements: Array<{ sql: string; params: QueryParam[] }>
): Promise<D1Result[]> {
  const db = getDB()
  const prepared = statements.map(s => db.prepare(s.sql).bind(...s.params))
  return await db.batch(prepared)
}

// ═══════════════════════════════════════
// HELPERS R2 - Stockage des enregistrements
// ═══════════════════════════════════════

// Type pour une clé de fichier R2
export type R2FileKey = string

// Uploader un fichier audio (enregistrement d'appel) vers R2
export async function uploadRecording(
  key: R2FileKey,
  data: ArrayBuffer | ReadableStream,
  contentType: string = 'audio/mpeg'
): Promise<string> {
  const r2 = getR2()
  await r2.put(key, data, {
    httpMetadata: { contentType },
  })
  // Retourner l'URL publique (à configurer dans R2 settings)
  return `https://recordings.voxyphone.com/${key}`
}

// Récupérer un enregistrement depuis R2
export async function getRecording(key: R2FileKey): Promise<R2ObjectBody | null> {
  const r2 = getR2()
  return await r2.get(key)
}

// Supprimer un enregistrement de R2
export async function deleteRecording(key: R2FileKey): Promise<void> {
  const r2 = getR2()
  await r2.delete(key)
}

// Lister les enregistrements d'une organisation
export async function listRecordings(prefix: string): Promise<R2Object[]> {
  const r2 = getR2()
  const list = await r2.list({ prefix })
  return list.objects
}
