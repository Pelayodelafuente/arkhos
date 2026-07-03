"use client";

// ══════════════════════════════════════
// Arkhos OPS — motor de sonido (WebAudio nativo, sin dependencias)
// Off por defecto; se activa desde el HUD (gesto de usuario → AudioContext
// permitido). Hum ambiental grave + click táctil + whoosh de foco.
// ══════════════════════════════════════

import { useEffect, useRef } from "react";
import { useSalaStore } from "@/stores/sala-store";

class SalaAudioEngine {
  private ctx: AudioContext | null = null;
  private humGain: GainNode | null = null;
  private humOscs: OscillatorNode[] = [];

  private ensure(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  startHum(): void {
    const ctx = this.ensure();
    if (this.humGain) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.018, ctx.currentTime + 1.5);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    gain.connect(ctx.destination);
    filter.connect(gain);
    // Dos osciladores desafinados: batido lento tipo sala de máquinas
    for (const freq of [55, 55.6]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start();
      this.humOscs.push(osc);
    }
    this.humGain = gain;
  }

  stopHum(): void {
    if (!this.ctx || !this.humGain) return;
    const gain = this.humGain;
    gain.gain.cancelScheduledValues(this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    const oscs = this.humOscs;
    window.setTimeout(() => {
      oscs.forEach((o) => o.stop());
      gain.disconnect();
    }, 500);
    this.humOscs = [];
    this.humGain = null;
  }

  click(): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 720;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  whoosh(): void {
    const ctx = this.ensure();
    const duration = 0.45;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  dispose(): void {
    this.stopHum();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

/** Monta el motor de audio y lo conecta a los eventos del store */
export function useSalaAudio(): void {
  const engineRef = useRef<SalaAudioEngine | null>(null);
  const soundOn = useSalaStore((s) => s.soundOn);

  useEffect(() => {
    if (!engineRef.current) engineRef.current = new SalaAudioEngine();
    if (soundOn) {
      engineRef.current.startHum();
    } else {
      engineRef.current.stopHum();
    }
  }, [soundOn]);

  useEffect(() => {
    const unsubscribe = useSalaStore.subscribe((state, prev) => {
      const engine = engineRef.current;
      if (!engine || !state.soundOn) return;
      if (state.focusedSlot !== prev.focusedSlot) engine.whoosh();
      if (state.assignments !== prev.assignments) engine.click();
      if (prev.draggingSlot !== null && state.draggingSlot === null) engine.click();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);
}
