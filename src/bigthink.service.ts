export interface PlaylistResponse {
  title: string;
  feedid: string;
  playlist: {
    mediaid: string;
    title: string;
    description: string;
    images: { src: string; width: number }[];
    sources: {
      file: string;
      type: string;
      label: string;
    }[];
    tracks: {
      file: string;
      kind: "captions" | "thumbnails";
    }[];
  }[];
}
