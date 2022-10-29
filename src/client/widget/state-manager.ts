import _default from "@tsndr/cloudflare-worker-jwt";
import { DataResponse } from "../../spotify";
import { StateQueue, StateTask } from "./state-queue";

export enum PlayerVisibility {
  Closed,
  Raised,
  Expanded,
}

export enum TitleVisibility {
  Hide,
  Show,
  Drop,
}

export interface PlayerState {
  artist: TitleVisibility;
  track: TitleVisibility;
  visibility: PlayerVisibility;
  data: DataResponse | null;
}

const PLAYER_TITLE_DROP_DELAY = 250;
const PLAYER_EXPAND_DELAY = 500;

export class StateManager {
  readonly queue = new StateQueue();
  private onUpdateCallback?: (state: PlayerState) => void;
  private cachedState: PlayerState;
  private player: DataResponse | null = null;
  private state: PlayerState = {
    artist: TitleVisibility.Hide,
    track: TitleVisibility.Hide,
    visibility: PlayerVisibility.Closed,
    data: null,
  };

  constructor() {
    this.cachedState = this.getState();
  }

  public getState() {
    return { ...this.state };
  }

  public onUpdate(cb: typeof this.onUpdateCallback) {
    this.onUpdateCallback = cb;
  }

  public handleResponse(player: DataResponse | null) {
    if (this.isEqualToCurrentPlayer(player)) {
      // no change, no update necessary
      return;
    }

    const tasks: StateTask[] = [];
    const oldState = this.getState();
    const newState = this.getState();

    if (player) {
      if (this.state.visibility === PlayerVisibility.Raised) {
        // change tracks (maybe)
        const artistsChanged = oldState?.data?.artists.join(", ") !== player.artists.join(", ");
        const titleChanged = oldState.data?.title !== player.title;

        artistsChanged &&
          tasks.push({
            action: this.dispatchAction({
              artist: TitleVisibility.Hide,
            }),
            delay: PLAYER_TITLE_DROP_DELAY,
          });

        titleChanged &&
          tasks.push({
            action: this.dispatchAction({
              track: TitleVisibility.Hide,
            }),
            delay: PLAYER_TITLE_DROP_DELAY,
          });

        tasks.push({
          action: this.dispatchAction({
            data: player,
          }),
          delay: 0,
        });

        artistsChanged &&
          tasks.push({
            action: this.dispatchAction({
              artist: TitleVisibility.Show,
            }),
            delay: PLAYER_TITLE_DROP_DELAY,
          });

        titleChanged &&
          tasks.push({
            action: this.dispatchAction({
              track: TitleVisibility.Show,
            }),
            delay: PLAYER_TITLE_DROP_DELAY,
          });
      } else {
        tasks.push({
          action: this.dispatchAction({
            artist: TitleVisibility.Hide,
            track: TitleVisibility.Hide,
          }),
          delay: PLAYER_TITLE_DROP_DELAY,
        });

        // raise/open player
        tasks.push(
          {
            action: this.dispatchAction({
              data: player,
              visibility: PlayerVisibility.Raised,
            }),
            delay: PLAYER_EXPAND_DELAY,
          },
          {
            action: this.dispatchAction({
              visibility: PlayerVisibility.Expanded,
            }),
            delay: PLAYER_EXPAND_DELAY,
          }
        );

        // show tracks
        tasks.push(
          {
            action: this.dispatchAction({
              artist: TitleVisibility.Show,
            }),
            delay: PLAYER_TITLE_DROP_DELAY,
          },
          {
            action: this.dispatchAction({
              track: TitleVisibility.Show,
            }),
            delay: PLAYER_TITLE_DROP_DELAY,
          }
        );
      }

      newState.artist = TitleVisibility.Show;
      newState.track = TitleVisibility.Show;
      newState.visibility = PlayerVisibility.Raised;
      newState.data = player;
    } else if (this.state.visibility === PlayerVisibility.Raised) {
      // There is no song playing, if the player is open, close it down.
      tasks.push(
        {
          action: this.dispatchAction({
            track: TitleVisibility.Drop,
          }),
          delay: PLAYER_TITLE_DROP_DELAY,
        },
        {
          action: this.dispatchAction({
            artist: TitleVisibility.Drop,
          }),
          delay: PLAYER_TITLE_DROP_DELAY,
        },
        {
          action: this.dispatchAction({
            visibility: PlayerVisibility.Raised,
          }),
          delay: PLAYER_EXPAND_DELAY,
        },
        {
          action: this.dispatchAction({
            visibility: PlayerVisibility.Closed,
            data: null,
          }),
          delay: PLAYER_EXPAND_DELAY,
        }
      );

      newState.artist = TitleVisibility.Drop;
      newState.track = TitleVisibility.Drop;
      newState.data = null;
      newState.visibility = PlayerVisibility.Closed;
    }

    this.player = player;
    this.state = newState;
    this.queue.push(...tasks);
  }

  private dispatchAction(state: Partial<PlayerState>) {
    return () => {
      const newState = { ...this.cachedState, ...state };
      this.dispatch(newState);
      this.cachedState = newState;
    };
  }

  private isEqualToCurrentPlayer(player: DataResponse | null) {
    if (player === this.player) {
      return true;
    }

    if (player?.artists.join(", ") !== this.player?.artists.join(", ")) {
      return false;
    }

    if (player?.albumArtUrl !== this.player?.albumArtUrl) {
      return false;
    }

    if (player?.title !== this.player?.title) {
      return false;
    }

    return true;
  }

  private dispatch(state: PlayerState) {
    this.onUpdateCallback?.(state);
  }
}
