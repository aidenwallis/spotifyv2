import { useEffect, useState } from "react";
import { trpc } from "../trpc";
import { CurrentlyPlayingResponse, DataResponse, getData } from "../../spotify";

class TokenExpiredError extends Error {
  constructor() {
    super("token expired");
  }
}

class RatelimitError extends Error {
  constructor(public readonly retryAfter: number) {
    super("ratelimited");
  }
}

const fetchStatus = async (accessToken: string) => {
  try {
    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    switch (r.status) {
      case 204: {
        return null;
      }

      case 401: {
        throw new TokenExpiredError();
      }

      case 429: {
        const ratelimitHeader = parseInt(r.headers.get("Retry-After") || "");
        const v = isNaN(ratelimitHeader) || !ratelimitHeader ? 10 : ratelimitHeader;
        throw new RatelimitError(v);
      }

      case 200: {
        const body = (await r.json()) as CurrentlyPlayingResponse;
        return body?.is_playing && body?.item ? body.item : null;
      }
    }

    throw new Error("unknown");
  } catch (error) {
    if (error instanceof RatelimitError) {
      throw error;
    }
    if (error instanceof TokenExpiredError) {
      throw error;
    }

    console.error("Failed to fetch song from Spotify API.", error);
    return null;
  }
};

export function useCurrentlyPlaying(overlayToken: string) {
  const [status, setStatus] = useState<DataResponse | null>(null);
  const { data: tokens, refetch } = trpc.getSpotifyToken.useQuery(
    {
      overlayToken,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!tokens?.accessToken) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;

    const fetchPlayer = () => {
      fetchStatus(tokens.accessToken!)
        .then((status) => {
          setStatus(getData(status));
          timeout = setTimeout(() => fetchPlayer(), 6_000);
        })
        .catch((error) => {
          if (error instanceof TokenExpiredError) {
            return refetch();
          }

          if (error instanceof RatelimitError) {
            console.log(`Spotify is ratelimiting the widget, retrying in ${error.retryAfter} seconds.`);
            timeout = setTimeout(() => fetchPlayer(), error.retryAfter * 1000);
            return;
          }

          // if it's an unknown error, just retry spotify in 10 seconds.
          timeout = setTimeout(() => fetchPlayer(), 10_000);
        });
    };

    fetchPlayer();

    return () => {
      timeout && clearTimeout(timeout);
    };
  }, [tokens?.accessToken, refetch, setStatus]);

  return status;
}
