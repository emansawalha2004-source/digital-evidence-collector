export function isMongoObjectId(value?: string | null): boolean {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

export function safeMongoObjectId(value?: string | null): string {
  const normalized = String(value || "").trim();
  return isMongoObjectId(normalized) ? normalized : "";
}
