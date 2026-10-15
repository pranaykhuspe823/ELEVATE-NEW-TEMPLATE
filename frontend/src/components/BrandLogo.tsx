/** The Elevate wordmark. The image is pre-trimmed to its artwork (1379x379,
 * transparent background), so it just scales: size it with a height class
 * and the width follows the aspect ratio. */
export default function BrandLogo({
  className = "h-[40px] sm:h-[50px]",
}: {
  className?: string;
}) {
  return (
    <img
      src="/elevate-logo.png"
      alt="Elevate – AI for Education"
      className={`block w-auto aspect-[1379/379] select-none ${className}`}
      draggable={false}
    />
  );
}
