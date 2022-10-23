export interface CurrentlyPlayingResponse {
  timestamp: number;
  progress_ms: number;
  is_playing: boolean;
  item: CurrentlyPlayingItem;
}

export interface CurrentlyPlayingItem {
  id: string;
  name: string;
  artists: Artist[];
  album: CurrentlyPlayingAlbum;
}

export interface CurrentlyPlayingAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
}

export interface Artist {
  id: string;
  name: string;
}

export interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

export function findLargestImage(images: SpotifyImage[]) {
  let image: SpotifyImage | null = null;
  for (const i of images) {
    if (!image) {
      image = i;
      continue;
    }

    if (i.width > image.width && i.height > image.height) {
      image = i;
    }
  }

  return image?.url || null;
}
