import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useLocation, useNavigate } from "react-router";
import {
  command,
  destroy,
  init,
  observeProperties,
  setProperty,
  type MpvConfig,
} from "tauri-plugin-mpv-api";
import {
  getWatchProgress,
  saveWatchProgress,
} from "../services/database";
import type { MediaFile } from "../shared/types/media";

type LocationState = {
  file?: MediaFile;
};

const observedProperties = [
  "pause",
  "time-pos",
  "duration",
  "filename",
  "volume",
] as const;

let playerStarting = false;
let playerStarted = false;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      minutes.toString().padStart(2, "0"),
      remainingSeconds.toString().padStart(2, "0"),
    ].join(":");
  }

  return [
    minutes.toString().padStart(2, "0"),
    remainingSeconds.toString().padStart(2, "0"),
  ].join(":");
}

export function PlayerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file } = (location.state ?? {}) as LocationState;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);

  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const lastSavedPositionRef = useRef(0);
  const resumePositionRef = useRef(0);
  const resumeAppliedRef = useRef(false);

  async function togglePause() {
    try {
      await setProperty("pause", !paused);
    } catch (value) {
      setError(String(value));
    }
  }

  async function seek(seconds: number) {
    if (durationRef.current <= 0) {
      return;
    }

    const nextPosition = Math.max(
      0,
      Math.min(
        positionRef.current + seconds,
        durationRef.current,
      ),
    );

    try {
      await setProperty("time-pos", nextPosition);
    } catch (value) {
      setError(String(value));
    }
  }

  async function seekTo(value: number) {
    if (durationRef.current <= 0) {
      return;
    }

    const nextPosition = Math.max(
      0,
      Math.min(value, durationRef.current),
    );

    try {
      await setProperty("time-pos", nextPosition);
    } catch (value) {
      setError(String(value));
    }
  }

  async function changeVolume(value: number) {
    const nextVolume = Math.max(0, Math.min(value, 100));

    setVolume(nextVolume);

    try {
      await setProperty("volume", nextVolume);
    } catch (errorValue) {
      setError(String(errorValue));
    }
  }

  async function toggleFullscreen() {
    try {
      const currentWindow = getCurrentWindow();
      const nextValue = !fullscreen;

      await currentWindow.setFullscreen(nextValue);
      setFullscreen(nextValue);
    } catch (value) {
      setError(String(value));
    }
  }

  async function saveCurrentProgress() {
    if (!file?.id || durationRef.current <= 0) {
      return;
    }

    await saveWatchProgress(
      file.id,
      positionRef.current,
      durationRef.current,
    );

    lastSavedPositionRef.current = positionRef.current;
  }

  async function handleBack() {
    try {
      await saveCurrentProgress();

      if (playerStarted) {
        playerStarted = false;
        playerStarting = false;
        await destroy();
      }
    } catch (value) {
      console.error("Player cleanup failed:", value);
    } finally {
      navigate(-1);
    }
  }

  useEffect(() => {
    if (!file?.path) {
      return;
    }

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    async function startPlayer() {
      if (playerStarting || playerStarted) {
        return;
      }

      playerStarting = true;
      setLoading(true);
      setError("");

      try {
        resumePositionRef.current = 0;
        resumeAppliedRef.current = false;
        positionRef.current = 0;
        durationRef.current = 0;
        lastSavedPositionRef.current = 0;

        if (file?.id) {
          const progress = await getWatchProgress(file.id);

          if (
            progress &&
            !progress.watched &&
            progress.positionSeconds > 5
          ) {
            resumePositionRef.current =
              progress.positionSeconds;
            lastSavedPositionRef.current =
              progress.positionSeconds;
          }
        }

        const config: MpvConfig = {
          args: [
            "--vo=gpu-next",
            "--hwdec=auto-safe",
            "--keep-open=yes",
            "--force-window",
          ],
          observedProperties,
          ipcTimeoutMs: 2000,
        };

        await init(config);
        playerStarted = true;

        unlisten = await observeProperties(
          observedProperties,
          ({ name, data }) => {
            if (cancelled) {
              return;
            }

            if (
              name === "time-pos" &&
              typeof data === "number"
            ) {
              positionRef.current = data;
              setPosition(data);
            }

            if (
              name === "duration" &&
              typeof data === "number"
            ) {
              durationRef.current = data;
              setDuration(data);

              if (
                !resumeAppliedRef.current &&
                resumePositionRef.current > 5 &&
                resumePositionRef.current < data * 0.9
              ) {
                resumeAppliedRef.current = true;

                const resumePosition =
                  resumePositionRef.current;

                positionRef.current = resumePosition;
                setPosition(resumePosition);

                void setProperty(
                  "time-pos",
                  resumePosition,
                ).catch((value) => {
                  console.error("Resume failed:", value);
                });
              }
            }

            if (
              name === "pause" &&
              typeof data === "boolean"
            ) {
              setPaused(data);
            }

            if (
              name === "volume" &&
              typeof data === "number"
            ) {
              setVolume(data);
            }
          },
        );

        await command("loadfile", [file.path]);

        playerStarting = false;

        if (!cancelled) {
          setLoading(false);
        }
      } catch (value) {
        playerStarting = false;
        playerStarted = false;

        if (!cancelled) {
          setError(String(value));
          setLoading(false);
        }
      }
    }

    void startPlayer();

    return () => {
      cancelled = true;
      unlisten?.();

      if (!playerStarted) {
        return;
      }

      playerStarted = false;
      playerStarting = false;

      void (async () => {
        try {
          if (file.id && durationRef.current > 0) {
            await saveWatchProgress(
              file.id,
              positionRef.current,
              durationRef.current,
            );
          }

          await destroy();
        } catch (value) {
          console.error("Player cleanup failed:", value);
        }
      })();
    };
  }, [file?.id, file?.path]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.code) {
        case "Space":
          event.preventDefault();
          void togglePause();
          break;

        case "ArrowLeft":
          void seek(-10);
          break;

        case "ArrowRight":
          void seek(10);
          break;

        case "ArrowUp":
          event.preventDefault();
          void changeVolume(volume + 5);
          break;

        case "ArrowDown":
          event.preventDefault();
          void changeVolume(volume - 5);
          break;

        case "KeyF":
          void toggleFullscreen();
          break;

        case "Escape":
          if (fullscreen) {
            void toggleFullscreen();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [paused, volume, fullscreen]);

  useEffect(() => {
    if (!file?.id) {
      return;
    }

    const timer = window.setInterval(() => {
      const currentPosition = positionRef.current;
      const currentDuration = durationRef.current;

      if (
        currentDuration <= 0 ||
        Math.abs(
          currentPosition -
            lastSavedPositionRef.current,
        ) < 3
      ) {
        return;
      }

      lastSavedPositionRef.current = currentPosition;

      void saveWatchProgress(
        file.id!,
        currentPosition,
        currentDuration,
      ).catch((value) => {
        console.error("Progress save failed:", value);
      });
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [file?.id]);

  if (!file) {
    return (
      <Alert severity="error">
        Видеофайл не найден.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "transparent",
        color: "white",
        pointerEvents: "none",
      }}
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => void handleBack()}
        sx={{
          mb: 2,
          pointerEvents: "auto",
        }}
      >
        Назад
      </Button>

      <Typography
        variant="h5"
        fontWeight={700}
        sx={{
          mb: 2,
          pointerEvents: "auto",
        }}
      >
        {file.episodeTitle ?? file.title}
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            pointerEvents: "auto",
          }}
        >
          {error}
        </Alert>
      )}

      {loading && (
        <Box
          sx={{
            minHeight: 420,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          p: 2,
          bgcolor: "rgba(0,0,0,0.75)",
          pointerEvents: "auto",
        }}
      >
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={1}
          value={Math.min(
            position,
            duration > 0 ? duration : 0,
          )}
          onChange={(event) => {
            void seekTo(Number(event.target.value));
          }}
          style={{ width: "100%" }}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mt: 1,
            flexWrap: "wrap",
          }}
        >
          <Button onClick={() => void seek(-10)}>
            −10 сек
          </Button>

          <Button onClick={() => void togglePause()}>
            {paused ? "Продолжить" : "Пауза"}
          </Button>

          <Button onClick={() => void seek(10)}>
            +10 сек
          </Button>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={(event) => {
              void changeVolume(
                Number(event.target.value),
              );
            }}
          />

          <Typography>
            {formatTime(position)} / {formatTime(duration)}
          </Typography>

          <Button
            onClick={() => void toggleFullscreen()}
            startIcon={
              fullscreen ? (
                <FullscreenExitIcon />
              ) : (
                <FullscreenIcon />
              )
            }
          >
            {fullscreen ? "Выйти" : "На весь экран"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}