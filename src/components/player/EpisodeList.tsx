import {
    Box,
    Chip,
    Divider,
    Drawer,
    List,
    ListItemButton,
    ListItemText,
    Typography,
  } from "@mui/material";
  import type { MediaFile } from "../../shared/types/media";
  
  type EpisodeListProps = {
    episodes: MediaFile[];
    currentEpisode?: MediaFile;
    open: boolean;
    onClose: () => void;
    onEpisodeSelect: (episode: MediaFile) => void;
  };
  
  export function EpisodeList({
    episodes,
    currentEpisode,
    open,
    onClose,
    onEpisodeSelect,
  }: EpisodeListProps) {
    const seasons = new Map<number, MediaFile[]>();
  
    for (const episode of episodes) {
      const season = episode.season ?? 0;
  
      if (!seasons.has(season)) {
        seasons.set(season, []);
      }
  
      seasons.get(season)!.push(episode);
    }
  
    const sortedSeasons = [...seasons.entries()].sort(
      (a, b) => a[0] - b[0],
    );
  
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 420,
            bgcolor: "background.default",
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography
            variant="h5"
            fontWeight={700}
          >
            Серии
          </Typography>
        </Box>
  
        <Divider />
  
        <Box
          sx={{
            overflowY: "auto",
            flex: 1,
          }}
        >
          {sortedSeasons.map(
            ([season, seasonEpisodes]) => (
              <Box key={season}>
                <Typography
                  variant="h6"
                  sx={{
                    px: 3,
                    py: 2,
                    fontWeight: 700,
                  }}
                >
                  Сезон {season}
                </Typography>
  
                <List disablePadding>
                  {seasonEpisodes
                    .sort(
                      (a, b) =>
                        (a.episode ?? 0) -
                        (b.episode ?? 0),
                    )
                    .map((episode) => {
                      const isCurrent =
                        currentEpisode?.id ===
                        episode.id;
  
                      const progress =
                        episode.watchDuration &&
                        episode.watchDuration > 0
                          ? Math.round(
                              ((episode.watchPosition ??
                                0) /
                                episode.watchDuration) *
                                100,
                            )
                          : 0;
  
                      return (
                        <ListItemButton
                          key={episode.id}
                          selected={isCurrent}
                          onClick={() =>
                            onEpisodeSelect(
                              episode,
                            )
                          }
                        >
                          <ListItemText
                            primary={
                              episode.episodeTitle ??
                              `Серия ${episode.episode}`
                            }
                            secondary={
                              <>
                                {`S${String(
                                  episode.season,
                                ).padStart(
                                  2,
                                  "0",
                                )}E${String(
                                  episode.episode,
                                ).padStart(
                                  2,
                                  "0",
                                )}`}
  
                                {episode.runtime &&
                                  ` • ${episode.runtime} мин`}
                              </>
                            }
                          />
  
                          {isCurrent ? (
                            <Chip
                              size="small"
                              label="▶"
                              color="primary"
                            />
                          ) : episode.isWatched ? (
                            <Chip
                              size="small"
                              label="✓"
                              color="success"
                            />
                          ) : progress > 0 ? (
                            <Chip
                              size="small"
                              label={`${progress}%`}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label="○"
                            />
                          )}
                        </ListItemButton>
                      );
                    })}
                    </List>
              </Box>
            ),
          )}
        </Box>
      </Drawer>
    );
  }
