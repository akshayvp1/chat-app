const COLORS = [
  "#e05c7a",
  "#e07a5f",
  "#3d405b",
  "#81b29a",
  "#f2cc8f",
  "#6a4c93",
  "#1982c4",
  "#8ac926",
];

export function getSenderColor(senderId: string): string {
  let hash = 0;

  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return COLORS[Math.abs(hash) % COLORS.length];
}
