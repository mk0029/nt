import type { MobileNumber } from "@/types/number";

function clean(value: string): string {
  return value.replace(/[\n\r;,]/g, " ").trim();
}

export function buildVCard(record: MobileNumber): string {
  const fn = clean(record.name || record.normalizedPhoneNumber);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fn}`,
    `N:${fn};;;;`,
    `TEL;TYPE=CELL:${record.normalizedPhoneNumber}`,
    ...(record.place ? [`ADR;TYPE=HOME:;;;${clean(record.place)};;;;`] : []),
    "END:VCARD",
  ];
  return lines.join("\r\n");
}

export function downloadVCard(record: MobileNumber): void {
  const name = clean(record.name || record.normalizedPhoneNumber);
  const blob = new Blob([buildVCard(record)], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]+/gi, "_")}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}