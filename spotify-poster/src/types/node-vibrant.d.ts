declare module "node-vibrant" {
  export default class Vibrant {
    constructor(img: string | HTMLImageElement);

    getPalette(): Promise<{
      Vibrant?: { rgb: [number, number, number] };
      Muted?: { rgb: [number, number, number] };
      DarkVibrant?: { rgb: [number, number, number] };
      LightVibrant?: { rgb: [number, number, number] };
      DarkMuted?: { rgb: [number, number, number] };
      LightMuted?: { rgb: [number, number, number] };
    }>;
  }
}