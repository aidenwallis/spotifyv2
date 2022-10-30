import { useCurrentlyPlaying } from "./useCurrentlyPlaying";
import { router } from "../router";
import { usePlayerState } from "./usePlayerState";
import { PlayerVisibility, TitleVisibility } from "./state-manager";
import { PropsWithChildren, useEffect, useState } from "react";
import { useImageLoaded } from "./useImageLoaded";
import styles from "./Widget.module.css";

const PlayerShell = ({ children, visibility }: PropsWithChildren<{ visibility: PlayerVisibility }>) => {
  const classes: Record<PlayerVisibility, string> = {
    [PlayerVisibility.Closed]: "w-16 opacity-0 translate-y-16",
    [PlayerVisibility.Expanded]: "w-80 opacity-100 translate-y-0",
    [PlayerVisibility.Raised]: "w-16 opacity-100 translate-y-0",
  };

  return (
    <div className={`rounded overflow-hidden bg-zinc-800 h-16 transition-all ease-in-out duration-200 ${classes[visibility]}`}>
      {children}
    </div>
  );
};

const AlbumArt = ({ albumArt }: { albumArt: string | null }) => {
  const [currentArt, setCurrentArt] = useState("");
  const loadedSrc = useImageLoaded(albumArt || "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadedSrc === albumArt && currentArt !== albumArt && setCurrentArt(albumArt);
    }, 150);

    return () => {
      clearTimeout(timeout);
    };
  }, [loadedSrc, albumArt, currentArt, setCurrentArt]);

  const imgClass = `absolute inset-0 w-16 h-16 ${styles.fadeIn}`;

  return (
    <div className="relative w-16 h-16">
      {!!currentArt && <img src={currentArt} className={imgClass} alt="Secondary art" />}
      {loadedSrc === albumArt && <img src={albumArt} className={imgClass} alt="Primary art" />}
    </div>
  );
};

const TitleVisibilityWrapper = ({ children, visibility }: PropsWithChildren<{ visibility: TitleVisibility }>) => {
  const classes: Record<TitleVisibility, string> = {
    [TitleVisibility.Drop]: "opacity-100 translate-y-16",
    [TitleVisibility.Hide]: "opacity-0 -translate-x-3",
    [TitleVisibility.Show]: "opacity-100 translate-x-0 translate-y-0",
  };

  return <div className={`transition-all ease-in-out duration-200 ${classes[visibility]}`}>{children}</div>;
};

const ArtistName = ({ artists }: { artists: string[] }) => {
  return (
    <marquee>
      <h3 className="text-green-400 leading-none font-bold uppercase truncate">{artists.join(", ")}</h3>
    </marquee>
  );
};

const TrackName = ({ name }: { name: string }) => {
  return (
    <marquee>
      <h1 className="text-white text-2xl leading-none font-bold truncate">{name}</h1>
    </marquee>
  );
};

export const PlayerWidget = () => {
  const { params } = router.useMatch("/overlay/:overlayToken");
  const status = useCurrentlyPlaying((params as { overlayToken: string })?.overlayToken);
  const state = usePlayerState(status);

  console.log(state);

  return (
    <PlayerShell visibility={state.visibility}>
      <div className="flex h-full relative items-center">
        <div className="left-0 top-0 absolute">
          <AlbumArt albumArt={state.data?.albumArtUrl || null} />
        </div>
        <div className="min-w-0 ml-16 pl-3 flex-1">
          <TitleVisibilityWrapper visibility={state.artist}>
            <ArtistName artists={state.data?.artists || []} />
          </TitleVisibilityWrapper>
          <TitleVisibilityWrapper visibility={state.track}>
            <div className="pt-1">
              <TrackName name={state.data?.title || ""} />
            </div>
          </TitleVisibilityWrapper>
        </div>
      </div>
    </PlayerShell>
  );
};
