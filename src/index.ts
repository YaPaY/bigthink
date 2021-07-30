import { createAddon, MovieItem, runCli, Source } from "@mediaurl/sdk";
import fetch from "node-fetch";

import { PlaylistResponse } from "./bigthink.service";

const typeRegex = /^(video|audio)/;

const cleanupSources = (
  sources: PlaylistResponse["playlist"][0]["sources"]
): Source[] => {
  return sources
    .filter((_) => {
      return _.label && typeRegex.test(_.type);
    })
    .sort((a, b) => {
      // a.label.localeCompare(b.label)
      return parseInt(a.label) - parseInt(b.label);
    })
    .map((_) => {
      return {
        url: _.file,
        name: _.label,
      };
    });
};

const init = async () => {
  const config = await fetch(`https://video.bigthink.com/config.json`).then<{
    content: { playlistId: string }[];
  }>((_) => _.json());

  const playlistNames = (
    await Promise.all(
      config.content.map((_) => {
        return fetch(
          `https://content.jwplatform.com/v2/playlists/${_.playlistId}`
        ).then<PlaylistResponse>((resp) => resp.json());
      })
    )
  )
    .map(({ title, feedid }) => {
      return { title, feedid };
    })
    .reduce((acc, value) => {
      acc[value.feedid] = value;
      return acc;
    }, {} as { [feedId: string]: { feedid: string; title: string } });

  const bigThinkAddon = createAddon({
    id: "bigthink",
    name: "Big Think",
    version: "0.0.0",
    icon: "https://api.faviconkit.com/bigthink.com/144",
    itemTypes: ["movie", "series"],
    catalogs: config.content.map((_) => {
      return {
        id: _.playlistId,
        name: playlistNames[_.playlistId].title,
      };
    }),
  });

  bigThinkAddon.registerActionHandler("catalog", async (input, ctx) => {
    console.log("catalog", input);

    await ctx.requestCache([input.catalogId, input.search]);

    const { playlist } = await ctx
      .fetch(`https://content.jwplatform.com/v2/playlists/${input.catalogId}`)
      .then<PlaylistResponse>((resp) => resp.json());

    return {
      nextCursor: null,
      options: {
        displayName: true,
        imageShape: "landscape",
      },
      items: playlist.map((_) => {
        return {
          type: "movie",
          ids: { id: _.mediaid },
          name: _.title,
          description: _.description,
          images: {
            poster: _.images[_.images.length - 1].src,
          },
          sources: cleanupSources(_.sources).map((sourceItem) =>
            Object.assign(sourceItem, <Partial<Source>>{
              subtitles: _.tracks
                .filter((track) => track.kind === "captions")
                .map((track) => ({
                  type: "vtt",
                  name: track.label,
                  url: track.file,
                  language: "en",
                })),
            })
          ),
        };
      }),
    };
  });

  // bigThinkAddon.registerActionHandler("item", async (input, ctx) => {
  //   console.log('item', input);
  // });

  runCli([bigThinkAddon]);
};

init();
