import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { FixSuggestionRecord } from "../types/resume";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

interface Props {
  fileUrl: string;
  suggestions: FixSuggestionRecord[];
  onRenderFailed?: () => void;
}

interface PageImage {
  width: number;
  height: number;
  dataUrl: string;
}

interface OverlayBox {
  suggestion: FixSuggestionRecord;
  pageIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function PdfResumeFixView({
  fileUrl,
  suggestions,
  onRenderFailed,
}: Props) {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [overlays, setOverlays] = useState<OverlayBox[]>([]);
  const [unmatched, setUnmatched] = useState<FixSuggestionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const pdf = await pdfjsLib.getDocument({ url: fileUrl, withCredentials: true })
          .promise;
        const scale = 1.5;
        const pageImages: PageImage[] = [];
        const foundOverlays: OverlayBox[] = [];
        const matchedIds = new Set<string>();

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas context unavailable");
          await page.render({ canvasContext: context, viewport }).promise;

          const textContent = await page.getTextContent();
          const items = textContent.items as {
            str: string;
            transform: number[];
            width: number;
          }[];

          // Match suggestions against the page's text ignoring all
          // whitespace, since PDF text extraction spacing is unreliable --
          // then map matched characters back to the text items that
          // produced them to compute an on-page bounding box.
          let stripped = "";
          const charToItem: (typeof items)[number][] = [];
          for (const item of items) {
            for (const ch of item.str) {
              if (/\s/.test(ch)) continue;
              stripped += ch;
              charToItem.push(item);
            }
          }
          const strippedLower = stripped.toLowerCase();

          for (const suggestion of suggestions) {
            if (matchedIds.has(suggestion.id)) continue;
            const query = suggestion.originalText.replace(/\s+/g, "");
            if (!query) continue;
            const idx = strippedLower.indexOf(query.toLowerCase());
            if (idx === -1) continue;

            const matchedItems = new Set<(typeof items)[number]>();
            for (
              let i = idx;
              i < idx + query.length && i < charToItem.length;
              i++
            ) {
              matchedItems.add(charToItem[i]);
            }
            if (matchedItems.size === 0) continue;

            const boxes = Array.from(matchedItems).map((item) => {
              const tx = pdfjsLib.Util.transform(
                viewport.transform,
                item.transform
              );
              const fontHeight = Math.hypot(tx[2], tx[3]);
              const scaleFactor = Math.hypot(
                viewport.transform[0],
                viewport.transform[1]
              );
              return {
                left: tx[4],
                top: tx[5] - fontHeight,
                width: item.width * scaleFactor,
                height: fontHeight,
              };
            });

            const left = Math.min(...boxes.map((b) => b.left));
            const top = Math.min(...boxes.map((b) => b.top));
            const right = Math.max(...boxes.map((b) => b.left + b.width));
            const bottom = Math.max(...boxes.map((b) => b.top + b.height));

            foundOverlays.push({
              suggestion,
              pageIndex: pageNum - 1,
              left,
              top,
              width: right - left,
              height: bottom - top,
            });
            matchedIds.add(suggestion.id);
          }

          pageImages.push({
            width: viewport.width,
            height: viewport.height,
            dataUrl: canvas.toDataURL(),
          });
        }

        if (cancelled) return;
        setPages(pageImages);
        setOverlays(foundOverlays);
        setUnmatched(suggestions.filter((s) => !matchedIds.has(s.id)));
      } catch {
        if (cancelled) return;
        setError("Couldn't render the PDF for annotation.");
        onRenderFailed?.();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  if (isLoading) {
    return <p className="text-text-2 text-sm">Rendering your resume…</p>;
  }

  if (error) {
    return (
      <p className="text-coral text-sm" role="alert">
        {error}
      </p>
    );
  }

  function suggestionCard(s: FixSuggestionRecord, showOriginal: boolean) {
    return (
      <div key={s.id} className="mb-3">
        {showOriginal && (
          <div className="font-mono text-[11px] text-coral line-through opacity-70 mb-1">
            {s.originalText}
          </div>
        )}
        <div className="text-lime-ink bg-lime/5 rounded-md px-2.5 py-1.5 text-sm">
          {s.suggestedText}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 flex-wrap lg:flex-nowrap">
      <div className="flex-1 min-w-[280px]">
        {pages.map((page, pageIdx) => (
          <div
            key={pageIdx}
            className="relative mb-4 border border-border rounded-lg overflow-hidden"
          >
            <img
              src={page.dataUrl}
              alt={`Resume page ${pageIdx + 1}`}
              className="block w-full h-auto"
            />
            {overlays
              .filter((o) => o.pageIndex === pageIdx)
              .map((o) => (
                <div
                  key={o.suggestion.id}
                  className="absolute bg-coral pointer-events-none"
                  style={{
                    left: `${(o.left / page.width) * 100}%`,
                    top: `${((o.top + o.height / 2) / page.height) * 100}%`,
                    width: `${(o.width / page.width) * 100}%`,
                    height: "2px",
                  }}
                />
              ))}
          </div>
        ))}
      </div>

      <div className="flex-1 min-w-[280px]">
        <p className="font-mono text-[10px] text-text-3 uppercase tracking-wide mb-2">
          Suggested fixes
        </p>
        {overlays.length === 0 && unmatched.length === 0 && (
          <p className="text-text-2 text-sm">No suggestions to show.</p>
        )}
        {overlays.map((o) => suggestionCard(o.suggestion, false))}
        {unmatched.length > 0 && (
          <div className={overlays.length > 0 ? "mt-4 pt-3 border-t border-border" : ""}>
            {overlays.length > 0 && (
              <p className="text-text-3 text-xs mb-2">
                Couldn't pinpoint these lines exactly on the page:
              </p>
            )}
            {unmatched.map((s) => suggestionCard(s, true))}
          </div>
        )}
      </div>
    </div>
  );
}
