const PLATFORM_STYLES: Record<string, { bg: string; glyph: string }> = {
  YouTube: { bg: "#FF0000", glyph: "▶" },
  Udemy: { bg: "#A435F0", glyph: "U" },
  Coursera: { bg: "#0056D2", glyph: "C" },
  Google: { bg: "#4285F4", glyph: "G" },
};

export default function PlatformIcon({ platform }: { platform: string }) {
  const { bg, glyph } = PLATFORM_STYLES[platform] ?? {
    bg: "#666c82",
    glyph: "?",
  };
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[11px] font-bold flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      {glyph}
    </span>
  );
}
