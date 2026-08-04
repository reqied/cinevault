import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
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
  episodes?: MediaFile[];
};

type MpvTrack = {
  id: number;
  type: "video" | "audio" | "sub";
  title?: string;
  lang?: string;
  codec?: string;
  selected?: boolean;
};

const observedProperties = [
  "pause",
  "time-pos",
  "duration",
  "filename",
  "volume",
  "track-list",
  "aid",
  "sid",
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

function getTrackLabel(track: MpvTrack): string {
  const parts = [
    track.title,
    track.lang?.toUpperCase(),
    track.codec?.toUpperCase(),
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return `${
    track.type === "audio" ? "Аудио" : "Субтитры"
  } ${track.id}`;
}

export function PlayerPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    file: initialFile,
    episodes = [],
  } = (location.state ?? {}) as LocationState;

  const [currentFile, setCurrentFile] =
    useState<MediaFile | undefined>(initialFile);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] =
    useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const [audioTracks, setAudioTracks] =
    useState<MpvTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] =
    useState<MpvTrack[]>([]);
  const [audioId, setAudioId] =
    useState<number | null>(null);
  const [subtitleId, setSubtitleId] =
    useState<number | "no">("no");

  const [
    nextEpisodeCountdown,
    setNextEpisodeCountdown,
  ] = useState<number | null>(null);

  const [
    autoPlayCancelled,
    setAutoPlayCancelled,
  ] = useState(false);

  const currentFileRef =
    useRef<MediaFile | undefined>(initialFile);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const lastSavedPositionRef = useRef(0);
  const resumePositionRef = useRef(0);
  const resumeAppliedRef = useRef(false);
  const switchingEpisodeRef = useRef(false);
  const destroyingRef = useRef(false);
  const controlsTimerRef =
    useRef<number | null>(null);
  const clickTimerRef =
    useRef<number | null>(null);

  const currentEpisodeIndex = currentFile
    ? episodes.findIndex(
        (episode) =>
          episode.id === currentFile.id ||
          episode.path === currentFile.path,
      )
    : -1;

  const previousEpisode =
    currentEpisodeIndex > 0
      ? episodes[currentEpisodeIndex - 1]
      : null;

  const nextEpisode =
    currentEpisodeIndex >= 0
      ? episodes[currentEpisodeIndex + 1] ?? null
      : null;

  function clearControlsTimer() {
    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }

  function scheduleControlsHide() {
    clearControlsTimer();

    if (
      paused ||
      menuOpen ||
      loading ||
      nextEpisodeCountdown !== null
    ) {
      return;
    }

    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }

  function showControls() {
    setControlsVisible(true);
    scheduleControlsHide();
  }

  function handleSurfaceClick() {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = window.setTimeout(() => {
      void togglePause();
      clickTimerRef.current = null;
    }, 220);
  }

  function handleSurfaceDoubleClick() {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    void toggleFullscreen();
  }

  async function saveCurrentProgress() {
    const file = currentFileRef.current;

    if (!file?.id || durationRef.current <= 0) {
      return;
    }

    await saveWatchProgress(
      file.id,
      positionRef.current,
      durationRef.current,
    );

    lastSavedPositionRef.current =
      positionRef.current;
  }

  async function prepareResume(file: MediaFile) {
    resumePositionRef.current = 0;
    resumeAppliedRef.current = false;
    positionRef.current = 0;
    durationRef.current = 0;
    lastSavedPositionRef.current = 0;

    setPosition(0);
    setDuration(0);
    setPaused(false);
    setAudioTracks([]);
    setSubtitleTracks([]);
    setAudioId(null);
    setSubtitleId("no");

    if (!file.id) {
      return;
    }

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

  async function loadMedia(file: MediaFile) {
    setLoading(true);
    setError("");
    setNextEpisodeCountdown(null);
    setAutoPlayCancelled(false);
    showControls();

    await prepareResume(file);

    await command("loadfile", [
      file.path,
      "replace",
    ]);

    currentFileRef.current = file;
    setCurrentFile(file);
    setLoading(false);
  }

  async function switchEpisode(
    episode: MediaFile | null,
  ) {
    if (
      !episode ||
      switchingEpisodeRef.current
    ) {
      return;
    }

    switchingEpisodeRef.current = true;

    try {
      await saveCurrentProgress();
      await loadMedia(episode);
    } catch (value) {
      setError(String(value));
    } finally {
      switchingEpisodeRef.current = false;
    }
  }

  async function togglePause() {
    try {
      await setProperty("pause", !paused);
      showControls();
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
      await setProperty(
        "time-pos",
        nextPosition,
      );
      showControls();
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
      await setProperty(
        "time-pos",
        nextPosition,
      );
      showControls();
    } catch (value) {
      setError(String(value));
    }
  }

  async function changeVolume(value: number) {
    const nextVolume = Math.max(
      0,
      Math.min(value, 100),
    );

    setVolume(nextVolume);

    try {
      await setProperty(
        "volume",
        nextVolume,
      );
      showControls();
    } catch (value) {
      setError(String(value));
    }
  }

  async function toggleFullscreen() {
    try {
      const currentWindow = getCurrentWindow();
      const nextValue = !fullscreen;

      await currentWindow.setFullscreen(
        nextValue,
      );

      setFullscreen(nextValue);
      showControls();
    } catch (value) {
      setError(String(value));
    }
  }

  async function selectAudio(id: number) {
    try {
      await setProperty("aid", id);
      setAudioId(id);
      showControls();
    } catch (value) {
      setError(String(value));
    }
  }

  async function selectSubtitle(
    id: number | "no",
  ) {
    try {
      await setProperty("sid", id);
      setSubtitleId(id);
      showControls();
    } catch (value) {
      setError(String(value));
    }
  }

  async function shutdownPlayer() {
    if (
      !playerStarted ||
      destroyingRef.current
    ) {
      return;
    }

    destroyingRef.current = true;
    playerStarted = false;
    playerStarting = false;

    try {
      await saveCurrentProgress();
      await destroy();
    } finally {
      destroyingRef.current = false;
    }
  }

  async function handleBack() {
    try {
      await shutdownPlayer();
    } catch (value) {
      console.error(
        "Player cleanup failed:",
        value,
      );
    } finally {
      navigate(-1);
    }
  }

  useEffect(() => {
    if (!initialFile?.path) {
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

      const config: MpvConfig = {
        args: [
          "--vo=gpu-next",
          "--hwdec=auto-safe",
          "--keep-open=yes",
          "--force-window",
        ],
        observedProperties,
        ipcTimeoutMs: 3000,
      };

      try {
        await init(config);
        playerStarted = true;

        unlisten = await observeProperties(
          observedProperties,
          ({ name, data }) => {
            if (cancelled) {
              return;
            }

            if (
              name === "track-list" &&
              Array.isArray(data)
            ) {
              const tracks = data as MpvTrack[];

              const nextAudioTracks =
                tracks.filter(
                  (track) =>
                    track.type === "audio",
                );

              const nextSubtitleTracks =
                tracks.filter(
                  (track) =>
                    track.type === "sub",
                );

              setAudioTracks(nextAudioTracks);
              setSubtitleTracks(nextSubtitleTracks);

              const selectedAudio =
                nextAudioTracks.find(
                  (track) => track.selected,
                );

              const selectedSubtitle =
                nextSubtitleTracks.find(
                  (track) => track.selected,
                );

              setAudioId(
                selectedAudio?.id ?? null,
              );

              setSubtitleId(
                selectedSubtitle?.id ?? "no",
              );
            }

            if (name === "aid") {
              setAudioId(
                typeof data === "number"
                  ? data
                  : null,
              );
            }

            if (name === "sid") {
              setSubtitleId(
                typeof data === "number"
                  ? data
                  : "no",
              );
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
                resumePositionRef.current <
                  data * 0.9
              ) {
                resumeAppliedRef.current = true;

                const resumePosition =
                  resumePositionRef.current;

                positionRef.current =
                  resumePosition;

                setPosition(resumePosition);

                void setProperty(
                  "time-pos",
                  resumePosition,
                ).catch((value) => {
                  console.error(
                    "Resume failed:",
                    value,
                  );
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

        await loadMedia(initialFile);

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
      clearControlsTimer();

      if (clickTimerRef.current !== null) {
        window.clearTimeout(
          clickTimerRef.current,
        );
      }

      if (
        !playerStarted ||
        destroyingRef.current
      ) {
        return;
      }

      destroyingRef.current = true;
      playerStarted = false;
      playerStarting = false;

      void (async () => {
        try {
          await saveCurrentProgress();
          await destroy();
        } catch (value) {
          console.error(
            "Player cleanup failed:",
            value,
          );
        } finally {
          destroyingRef.current = false;
        }
      })();
    };
  }, [initialFile?.path]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.target instanceof
          HTMLInputElement ||
        event.target instanceof
          HTMLTextAreaElement
      ) {
        return;
      }

      showControls();

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

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    paused,
    volume,
    fullscreen,
    menuOpen,
    loading,
    nextEpisodeCountdown,
  ]);

  useEffect(() => {
    if (
      paused ||
      menuOpen ||
      loading ||
      nextEpisodeCountdown !== null
    ) {
      clearControlsTimer();
      setControlsVisible(true);
      return;
    }

    scheduleControlsHide();

    return clearControlsTimer;
  }, [
    paused,
    menuOpen,
    loading,
    nextEpisodeCountdown,
  ]);

  useEffect(() => {
    if (!currentFile?.id) {
      return;
    }

    const timer = window.setInterval(() => {
      const currentPosition =
        positionRef.current;

      const currentDuration =
        durationRef.current;

      if (
        currentDuration <= 0 ||
        Math.abs(
          currentPosition -
            lastSavedPositionRef.current,
        ) < 3
      ) {
        return;
      }

      lastSavedPositionRef.current =
        currentPosition;

      void saveWatchProgress(
        currentFile.id!,
        currentPosition,
        currentDuration,
      ).catch((value) => {
        console.error(
          "Progress save failed:",
          value,
        );
      });
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [currentFile?.id]);

  useEffect(() => {
    if (
      !nextEpisode ||
      autoPlayCancelled ||
      duration <= 0 ||
      position < duration - 15
    ) {
      return;
    }

    setNextEpisodeCountdown(
      (current) => current ?? 5,
    );
  }, [
    position,
    duration,
    nextEpisode,
    autoPlayCancelled,
  ]);

  useEffect(() => {
    if (nextEpisodeCountdown === null) {
      return;
    }

    if (nextEpisodeCountdown <= 0) {
      void switchEpisode(nextEpisode);
      return;
    }

    const timer = window.setTimeout(() => {
      setNextEpisodeCountdown(
        (current) =>
          current === null
            ? null
            : current - 1,
      );
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    nextEpisodeCountdown,
    nextEpisode,
  ]);

  if (!currentFile) {
    return (
      <Alert severity="error">
        Видеофайл не найден.
      </Alert>
    );
  }

  return (
    <Box
      onMouseMove={showControls}
      onMouseDown={handleSurfaceClick}
      onDoubleClick={handleSurfaceDoubleClick}
      sx={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        color: "white",
        cursor: controlsVisible
          ? "default"
          : "none",
        pointerEvents: "auto",
      }}
    >
      <Box
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        onDoubleClick={(event) =>
          event.stopPropagation()
        }
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 110,
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 2,
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible
            ? "auto"
            : "none",
          transition: "opacity 200ms ease",
          background:
            "linear-gradient(rgba(0,0,0,0.75), transparent)",
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => void handleBack()}
        >
          Назад
        </Button>

        <Typography
          variant="h5"
          fontWeight={700}
        >
          {currentFile.episodeTitle ??
            currentFile.title}
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          onMouseDown={(event) =>
            event.stopPropagation()
          }
          sx={{
            position: "fixed",
            top: 80,
            left: 24,
            right: 24,
            zIndex: 130,
          }}
        >
          {error}
        </Alert>
      )}

      {loading && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {nextEpisodeCountdown !== null &&
        nextEpisode && (
          <Box
            onMouseDown={(event) =>
              event.stopPropagation()
            }
            onDoubleClick={(event) =>
              event.stopPropagation()
            }
            sx={{
              position: "fixed",
              right: 24,
              bottom: 130,
              zIndex: 120,
              width: 340,
              p: 3,
              borderRadius: 2,
              bgcolor:
                "rgba(15,15,20,0.94)",
            }}
          >
            <Typography fontWeight={700}>
              Следующая серия
            </Typography>

            <Typography sx={{ mt: 1 }}>
              {nextEpisode.episodeTitle ??
                `Серия ${nextEpisode.episode}`}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Начнётся через{" "}
              {nextEpisodeCountdown} сек.
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 1,
                mt: 2,
              }}
            >
              <Button
                variant="contained"
                onClick={() =>
                  void switchEpisode(
                    nextEpisode,
                  )
                }
              >
                Смотреть сейчас
              </Button>

              <Button
                onClick={() => {
                  setNextEpisodeCountdown(
                    null,
                  );
                  setAutoPlayCancelled(
                    true,
                  );
                }}
              >
                Отмена
              </Button>
            </Box>
          </Box>
        )}

      <Box
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        onDoubleClick={(event) =>
          event.stopPropagation()
        }
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          p: 2,
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible
            ? "auto"
            : "none",
          transition: "opacity 200ms ease",
          background:
            "linear-gradient(transparent, rgba(0,0,0,0.92) 35%)",
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
            void seekTo(
              Number(event.target.value),
            );
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
          {previousEpisode && (
            <Button
              onClick={() =>
                void switchEpisode(
                  previousEpisode,
                )
              }
            >
              Предыдущая серия
            </Button>
          )}

          <Button
            onClick={() => void seek(-10)}
          >
            −10 сек
          </Button>

          <Button
            onClick={() =>
              void togglePause()
            }
          >
            {paused
              ? "Продолжить"
              : "Пауза"}
          </Button>

          <Button
            onClick={() => void seek(10)}
          >
            +10 сек
          </Button>

          {nextEpisode && (
            <Button
              onClick={() =>
                void switchEpisode(
                  nextEpisode,
                )
              }
            >
              Следующая серия
            </Button>
          )}

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
            {formatTime(position)} /{" "}
            {formatTime(duration)}
          </Typography>

          {audioTracks.length > 0 && (
            <Select
              size="small"
              value={audioId ?? ""}
              displayEmpty
              onOpen={() => {
                setMenuOpen(true);
                setControlsVisible(true);
                clearControlsTimer();
              }}
              onClose={() => {
                setMenuOpen(false);
              }}
              onChange={(event) => {
                const value =
                  event.target.value;

                if (value === "") {
                  return;
                }

                void selectAudio(
                  Number(value),
                );
              }}
              sx={{
                minWidth: 180,
                color: "white",
              }}
            >
              {audioId === null && (
                <MenuItem
                  value=""
                  disabled
                >
                  Аудиодорожка
                </MenuItem>
              )}

              {audioTracks.map((track) => (
                <MenuItem
                  key={`audio-${track.id}`}
                  value={track.id}
                >
                  {getTrackLabel(track)}
                </MenuItem>
              ))}
            </Select>
          )}

          <Select
            size="small"
            value={subtitleId}
            onOpen={() => {
              setMenuOpen(true);
              setControlsVisible(true);
              clearControlsTimer();
            }}
            onClose={() => {
              setMenuOpen(false);
            }}
            onChange={(event) => {
              const value =
                event.target.value;

              void selectSubtitle(
                value === "no"
                  ? "no"
                  : Number(value),
              );
            }}
            sx={{
              minWidth: 190,
              color: "white",
            }}
          >
            <MenuItem value="no">
              Субтитры выключены
            </MenuItem>

            {subtitleTracks.map(
              (track) => (
                <MenuItem
                  key={`subtitle-${track.id}`}
                  value={track.id}
                >
                  {getTrackLabel(track)}
                </MenuItem>
              ),
            )}
          </Select>

          <Button
            onClick={() =>
              void toggleFullscreen()
            }
            startIcon={
              fullscreen ? (
                <FullscreenExitIcon />
              ) : (
                <FullscreenIcon />
              )
            }
          >
            {fullscreen
              ? "Выйти"
              : "На весь экран"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}