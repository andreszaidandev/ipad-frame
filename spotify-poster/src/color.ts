// Resolve to the average color of an image, used as the poster's ambient glow.
export function averageColor(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 60;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no 2d context"));

      ctx.drawImage(img, 0, 0, 60, 60);
      const { data } = ctx.getImageData(0, 0, 60, 60);

      let r = 0, g = 0, b = 0;
      const pixels = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }

      resolve(
        `rgb(${Math.round(r / pixels)}, ${Math.round(g / pixels)}, ${Math.round(b / pixels)})`
      );
    };

    img.onerror = reject;
    img.src = src;
  });
}
