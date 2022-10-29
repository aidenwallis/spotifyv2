import { TRPCError } from "@trpc/server";
import { DataResponse, getData } from "../../spotify";
import { UserModel } from "../db";
import { Dependencies } from "../deps";
import { UserService } from "../user/service";
import { validateTokens } from "../user/tokens";
import { RatelimitedResponse, SpotifyService } from "./service";

const jsonResp = <T>(body: T, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });

interface BaseResponse {
  status: number;
}

interface ErrorResponse extends BaseResponse {
  error: string;
}

interface SuccessResponse extends BaseResponse {
  data: DataResponse | null;
  message: string;
}

type GenericResponse = ErrorResponse | SuccessResponse;

async function doGenericWork(apiToken: string, deps: Dependencies): Promise<GenericResponse> {
  const spotifyService = new SpotifyService(deps);
  const userService = new UserService(deps);

  if (!apiToken) {
    return { error: "Not Found", status: 404 };
  }

  const user = await userService.getByApiToken(apiToken);
  if (!user) {
    return { error: "Not Found", status: 404 };
  }

  let validatedUser: UserModel;

  try {
    validatedUser = await validateTokens(userService, spotifyService, user);
    if (!validatedUser) {
      throw new Error("unable to resolve");
    }
    if (!validatedUser.accessToken) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
  } catch (error) {
    let errorMessage = "Unable to verify Spotify credentials, please try again later.";
    let status = 400;

    if (error instanceof TRPCError) {
      switch (error.code) {
        case "FORBIDDEN": {
          errorMessage = "Invalid Spotify credentials. Please re-login to the service.";
          status = 403;
          break;
        }
      }
    }

    return { error: errorMessage, status: status };
  }

  try {
    const resp = await spotifyService.getCurrentlyPlaying(validatedUser.accessToken);
    const data = getData(resp?.item || null);
    if (!data) {
      return { data: null, message: "No song playing.", status: 200 };
    }

    return { data, message: `${data.artists.join(", ")} - ${data.title}`, status: 200 };
  } catch (error) {
    if (error instanceof RatelimitedResponse) {
      return { error: "Spotify is blocking us from requesting your data, please try again later.", status: 429 };
    }
    console.error(error);
    return { error: "Failed to get Song from Spotify API, please try again later.", status: 400 };
  }
}

function isErrorResponse(resp: GenericResponse): resp is ErrorResponse {
  return !!(resp as ErrorResponse)?.error;
}

export async function currentlyPlaying(
  { params, query }: { params: { apiToken: string }; query: { type?: string } },
  deps: Dependencies
) {
  const resp = await doGenericWork(params?.apiToken || "", deps);

  if (query?.type === "json") {
    if (isErrorResponse(resp)) {
      return jsonResp({ error: resp.error }, resp.status);
    }
    return jsonResp(
      {
        data: resp.data,
        message: resp.message,
      },
      resp.status
    );
  }

  return new Response(isErrorResponse(resp) ? resp.error : resp.message, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    status: resp.status,
  });
}
