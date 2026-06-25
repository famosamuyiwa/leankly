import {
  createVideoPlayer,
  type PlayerError,
  type VideoPlayer,
  type VideoSource,
} from "expo-video";

const authPlaybackAssetId = require("@/assets/videos/auth_playback.mov");

export const authPlaybackVideoSource: VideoSource = {
  assetId: authPlaybackAssetId,
  useCaching: true,
};

let authPlaybackPlayer: VideoPlayer | null = null;
let authPlaybackReadyPromise: Promise<VideoPlayer> | null = null;

function configureAuthPlaybackPlayer(player: VideoPlayer) {
  player.loop = false;
  player.muted = true;
  player.currentTime = 0;
}

export function getAuthPlaybackPlayer() {
  if (!authPlaybackPlayer) {
    authPlaybackPlayer = createVideoPlayer(authPlaybackVideoSource);
    configureAuthPlaybackPlayer(authPlaybackPlayer);
  }

  return authPlaybackPlayer;
}

export function playAuthPlaybackVideo() {
  const player = getAuthPlaybackPlayer();
  player.currentTime = 0;
  player.play();
}

export function pauseAuthPlaybackVideo() {
  if (!authPlaybackPlayer) return;

  authPlaybackPlayer.pause();
  authPlaybackPlayer.currentTime = 0;
}

export function preloadAuthPlaybackVideo() {
  const player = getAuthPlaybackPlayer();

  if (player.status === "readyToPlay") {
    return Promise.resolve(player);
  }

  if (player.status === "error") {
    return Promise.reject(toPlayerError());
  }

  if (authPlaybackReadyPromise) {
    return authPlaybackReadyPromise;
  }

  authPlaybackReadyPromise = new Promise((resolve, reject) => {
    const subscription = player.addListener(
      "statusChange",
      ({ status, error }) => {
        if (status === "readyToPlay") {
          subscription.remove();
          resolve(player);
          return;
        }

        if (status === "error") {
          subscription.remove();
          authPlaybackReadyPromise = null;
          reject(toPlayerError(error));
        }
      },
    );
  });

  return authPlaybackReadyPromise;
}

function toPlayerError(error?: PlayerError) {
  return new Error(error?.message ?? "Auth playback video failed to preload.");
}
