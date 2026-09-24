/** The logo image has a lot of transparent padding, so it's cropped to its
 * artwork (882x264 inside the 1012x555 file) instead of being scaled up and
 * left to overflow. Size it with a height class; width follows the aspect. */
export default function BrandLogo({
  className = "h-[40px] sm:h-[50px]",
}: {
  className?: string;
}) {
  return (
    <span className={`relative block aspect-[882/264] overflow-hidden ${className}`}>
      <img
        src="/newlogo.png"
        alt="Elevate Core5"
        className="absolute max-w-none select-none"
        style={{ width: "114.74%", left: "-7.26%", top: "-48.48%" }}
        draggable={false}
      />
    </span>
  );
}
