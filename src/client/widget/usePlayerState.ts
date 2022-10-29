import { useEffect, useState } from "react";
import { DataResponse } from "../../spotify";
import { StateManager } from "./state-manager";

const manager = new StateManager();

export function usePlayerState(status: DataResponse | null) {
  const [state, setState] = useState(manager.getState());

  useEffect(() => {
    manager.handleResponse(status);
  }, [status]);

  useEffect(() => {
    manager.onUpdate(setState);

    return () => {
      manager.queue.close();
    };
  }, [manager, setState]);

  return state;
}
