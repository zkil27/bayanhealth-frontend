"use client";

import { useState, useEffect } from "react";
import { AudioScrubber } from "@/components/ui/waveform";
import {
  AudioPlayerButton,
  AudioPlayerTime,
  AudioPlayerDuration,
  AudioPlayerProvider,
  useAudioPlayer,
  useAudioPlayerTime,
} from "@/components/ui/audio-player";
import { MarkerStrip } from "./AudioMarkers";
import { FileVolume, Volume2 } from "lucide-react";

interface AudioTrailProps {
  /** URL to the consultation audio recording. Omit when no recording exists yet. */
  audioSrc?: string;
}

function AudioPlayerWithWaveform({ audioSrc }: { audioSrc: string }) {
  const audio = { id: "audio-consultation", src: audioSrc };
  const { play, isPlaying, seek, duration, setActiveItem, error, activeItem } =
    useAudioPlayer();
  const currentTime = useAudioPlayerTime();
  const [waveformData, setWaveformData] = useState<number[]>([]);

  useEffect(() => {
    setActiveItem(audio);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveItem, audioSrc]);

  // Convert audio file to waveform data
  useEffect(() => {
    async function generateWaveform() {
      const response = await fetch(audioSrc);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const samples = audioBuffer.getChannelData(0);
      const barCount = 200;
      const samplesPerBar = Math.floor(samples.length / barCount);
      const bars: number[] = [];
      for (let i = 0; i < barCount; i++) {
        let maxAmplitude = 0;
        const start = i * samplesPerBar;
        const end = start + samplesPerBar;
        for (let j = start; j < end; j++) {
          const amplitude = Math.abs(samples[j]);
          if (amplitude > maxAmplitude) maxAmplitude = amplitude;
        }
        bars.push(maxAmplitude);
      }
      const globalMax = Math.max(...bars);
      const normalized = globalMax > 0 ? bars.map((v) => v / globalMax) : bars;
      setWaveformData(normalized);
      audioContext.close();
    }
    generateWaveform();
  }, [audioSrc]);

  if (error) {
    return (
      <div className="text-red-500">
        Failed to load: {activeItem?.src}
        <br />
        Error: {error.message}
      </div>
    );
  }

  function handleSeek(seekTime: number) {
    if (isNaN(seekTime) || !isFinite(seekTime) || seekTime < 0) return;
    seek(seekTime);
    if (!isPlaying) play(audio);
  }

  return (
    <div className="flex w-screen items-center gap-2">
      <div className="flex h-full w-20 shrink-0 flex-col items-center justify-center gap-2">
        <div>
          <span className="text-xs font-semibold">Audio Trail</span>
        </div>
        <AudioPlayerButton item={audio} />
        <div className="flex shrink-0 items-center gap-1">
          <FileVolume className="size-4" />
          <AudioPlayerTime className="text-xs" />
          <span className="text-xs">/</span>
          <AudioPlayerDuration className="text-xs" />
        </div>
      </div>

      {waveformData.length > 0 ? (
        <div className="w-full rounded-lg bg-muted px-4 py-2">
          <AudioScrubber
            data={waveformData}
            currentTime={currentTime}
            duration={duration ?? 0}
            onSeek={handleSeek}
            height={125}
            barWidth={5}
            barHeight={10}
            barRadius={10}
            barGap={1}
            className="w-full pb-2"
          />
          <div>
            <MarkerStrip duration={duration ?? 0} />
          </div>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          Loading waveform...
        </div>
      )}
    </div>
  );
}

export function AudioTrail({ audioSrc }: AudioTrailProps) {
  // No audio available — render an empty state rather than playing a demo file
  if (!audioSrc) {
    return (
      <div className="flex w-full items-center gap-4 rounded-lg border border-dashed bg-muted/30 p-4 text-muted-foreground">
        <Volume2 className="size-6 shrink-0 opacity-40" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-foreground">Audio Trail</span>
          <span className="text-xs">
            Consultation audio will appear here once the recording is processed.
          </span>
        </div>
      </div>
    );
  }

  return (
    <AudioPlayerProvider>
      <AudioPlayerWithWaveform audioSrc={audioSrc} />
    </AudioPlayerProvider>
  );
}
