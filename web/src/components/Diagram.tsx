export function Diagram({ svg }: { svg: string }) {
  // These SVGs are extracted verbatim from the original (light-themed) course
  // site and carry their own baked-in stroke/text colors tuned for a light
  // background. Rather than fighting third-party SVG internals, the wrapper
  // always stays light so the diagram itself remains legible in dark mode.
  return (
    <div
      className="my-4 max-w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white p-3 [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
