import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AppRouter } from "../../server/trpc";
import { useAuth } from "../auth";
import { trpc } from "../trpc";
import { Logo } from "./logo";

type TokenType = AppRouter["resetToken"]["_def"]["_input_in"]["type"];

const useTimeout = () => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      timeoutRef.current && clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback((fn: () => void, timeout: number) => {
    timeoutRef.current && clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(fn, timeout);
  }, []);
};

export const CopyableField = (props: { label: string; url: string; tokenType: TokenType }) => {
  const [copied, setCopied] = useState(false);
  const [reset, setReset] = useState(false);
  const [unblurred, setUnblurred] = useState(false);
  const copyTimeout = useTimeout();
  const resetTimeout = useTimeout();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const ctx = trpc.useContext();
  const resetToken = trpc.resetToken.useMutation();

  const handleClick = () => {
    navigator?.clipboard?.writeText(props.url);
    setCopied(true);
    !unblurred && setUnblurred(true);
    inputRef?.current?.select();

    copyTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  const label = () => {
    if (reset) {
      return "successfully reset token!";
    }

    if (copied) {
      return "copied to clipboard!";
    }

    return "click to show and copy";
  };

  const handleReset = async () => {
    try {
      const resp = await resetToken.mutateAsync({ type: props.tokenType });
      ctx.currentUser.setData(undefined, resp);
      setReset(true);
      resetTimeout(() => {
        setReset(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to reset token:", error);
    }
  };

  return (
    <div>
      <label
        htmlFor={id}
        className={`${
          copied || reset ? "text-green-300" : "text-slate-300 hover:text-slate-100"
        } text-sm pb-1 block cursor-pointer`}
        onClick={handleClick}
      >
        {props.label} ({label()}):
      </label>
      <div className="flex bg-slate-700 drop-shadow-md">
        <div className="rounded-l-md border flex-1 border-slate-600">
          <input
            type="text"
            id={id}
            ref={inputRef}
            readOnly
            value={props.url}
            onClick={handleClick}
            className={`w-full ${
              unblurred ? "blur-none" : "blur-sm"
            } transition ease-in-out duration-100 bg-transparent text-white p-3 flex-1 outline-none block overflow-ellipsis`}
          />
        </div>
        <div className="rounded-r-md overflow-hidden">
          <button
            className={`${
              resetToken.isLoading ? "bg-slate-500" : "bg-red-600 hover:bg-red-500 active:bg-red-700"
            } text-white font-bold text-sm h-full px-4`}
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export const AuthBox = () => {
  const { data: user } = trpc.currentUser.useQuery();
  const { logout } = useAuth();

  if (!user) {
    return (
      <div className="animate-pulse flex items-center space-x-4">
        <div className="rounded-full bg-slate-700 h-10 w-10"></div>
        <div>
          <div className="h-4 rounded bg-slate-600" />
        </div>
      </div>
    );
  }

  const { location } = window;
  const baseUrl = `${location.protocol}//${location.host}`;

  return (
    <>
      <div className="flex justify-center items-center space-x-4 pb-6">
        {!!user.avatar && <img src={user.avatar} width="40" height="40" alt={user.name} className="rounded-full" />}
        <div className="">
          <h3 className="text-white font-semibold text-lg">Hey, {user.name}!</h3>
          <p className="text-xs text-slate-300">
            <button onClick={() => logout()}>Log out</button>
          </p>
        </div>
      </div>

      <p className="pb-6 text-base text-slate-50">
        Use the below URLs to access the Now Playing Service. The browser source will display a widget that updates as you listen
        to different songs, and the CustomAPI returns a plaintext response of the song currently playing.
      </p>

      <p className="pb-6 text-base font-bold text-red-400 text-center">
        Do not leak your overlay token. It will give someone API access to your Spotify account. Keep it private.
      </p>

      <div className="flex flex-col space-y-5">
        <CopyableField label="Browser source URL" url={baseUrl + "/overlay/" + user.overlayToken} tokenType="overlayToken" />
        <CopyableField label="CustomAPI URL" url={baseUrl + "/current/" + user.apiToken} tokenType="apiToken" />
      </div>
    </>
  );
};

export const LoginPrompt = () => {
  return (
    <div className="text-center">
      <p className="text-slate-50">Please login with Spotify to continue.</p>
      <div className="pt-4">
        <a
          href="/auth/redirect"
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-800 text-sm font-semibold text-white px-4 py-2 rounded-md cursor-pointer inline-block"
        >
          Login with Spotify
        </a>
      </div>
    </div>
  );
};

export const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="fixed bg-slate-800 w-screen h-screen inset-0 overflow-auto">
      <div className="py-12 block">
        <div style={{ maxWidth: isAuthenticated ? "40rem" : "20rem" }} className="w-full mx-auto block">
          <div className="flex justify-center pb-5">
            <Logo height={40} />
          </div>

          <div className="bg-slate-700 rounded-md p-5 border border-slate-600 drop-shadow-md">
            {isAuthenticated ? <AuthBox /> : <LoginPrompt />}
          </div>
        </div>
      </div>
    </div>
  );
};
