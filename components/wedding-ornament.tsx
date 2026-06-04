/**
 * Nome: components/wedding-ornament.tsx
 * Função: Renderiza ornamentos botânicos terrosos usados nas telas iniciais.
 */

interface WeddingOrnamentProps {
  position: "top-right" | "bottom-left"
  size?: "sm" | "md"
  opacity?: string
}

const leaves = {
  "top-right": [
    { cx: 120, cy: 40, rx: 34, ry: 13, fill: "#8A6A44", rotate: -50 },
    { cx: 105, cy: 25, rx: 26, ry: 10, fill: "#6F5234", rotate: -30 },
    { cx: 140, cy: 60, rx: 22, ry: 9, fill: "#9B8053", rotate: -65 },
    { cx: 90, cy: 50, rx: 18, ry: 7, fill: "#7A6F3F", rotate: -20 },
    { cx: 130, cy: 80, rx: 20, ry: 8, fill: "#6F5234", rotate: -75 },
  ],
  "bottom-left": [
    { cx: 40, cy: 120, rx: 34, ry: 13, fill: "#8A6A44", rotate: 50 },
    { cx: 55, cy: 135, rx: 26, ry: 10, fill: "#6F5234", rotate: 30 },
    { cx: 20, cy: 100, rx: 22, ry: 9, fill: "#9B8053", rotate: 65 },
    { cx: 70, cy: 110, rx: 18, ry: 7, fill: "#7A6F3F", rotate: 20 },
    { cx: 30, cy: 80, rx: 20, ry: 8, fill: "#6F5234", rotate: 75 },
  ],
}

export function WeddingOrnament({
  position,
  size = "md",
  opacity = "opacity-25",
}: WeddingOrnamentProps) {
  const positionClass =
    position === "top-right" ? "-top-4 -right-6" : "-bottom-4 -left-6"
  const sizeClass = size === "sm" ? "w-36" : "w-40"

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute ${positionClass} ${sizeClass} ${opacity}`}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {leaves[position].map((leaf) => (
        <ellipse
          key={`${leaf.cx}-${leaf.cy}-${leaf.rotate}`}
          cx={leaf.cx}
          cy={leaf.cy}
          rx={leaf.rx}
          ry={leaf.ry}
          fill={leaf.fill}
          transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
        />
      ))}
    </svg>
  )
}
