export type ImageFormat = "png" | "jpeg";

export async function exportSvgChart(
  svgId: string,
  filename: string,
  format: ImageFormat
) {
  const source = document.getElementById(svgId) as SVGSVGElement | null;
  if (!source) {
    throw new Error("Diagramma topilmadi.");
  }

  const clone = source.cloneNode(true) as SVGSVGElement;
  const viewBox = clone.viewBox.baseVal;
  const width = viewBox?.width || Number(clone.getAttribute("width")) || 960;
  const height = viewBox?.height || Number(clone.getAttribute("height")) || 420;

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const serializer = new XMLSerializer();
  const svgText = serializer.serializeToString(clone);
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Diagrammani rasmga aylantirib bo‘lmadi."));
      image.src = objectUrl;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas yaratib bo‘lmadi.");
    }

    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const quality = format === "jpeg" ? 0.95 : undefined;
    const dataUrl = canvas.toDataURL(mime, quality);
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `${filename}.${format === "jpeg" ? "jpg" : "png"}`;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
