import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { countBetweenSamples, type StepSample } from './step-counter';

export const dayKey = (date = new Date()) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2, '0')).join('-');
type Totals = Record<string, number>;
type Status = 'checking' | 'ready' | 'permission' | 'unavailable';
const key = 'healthy.steps.v2';
const nativeSteps = NativeModules.HealthySteps as {
  start(run: number): Promise<boolean>; stop(): void;
} | undefined;

// Android sensor subscriptions report steps since the current subscription started.
export function useActivity() {
  const [totals, setTotals] = useState<Totals>({});
  const [day, setDay] = useState(dayKey);
  const [status, setStatus] = useState<Status>('checking');
  const data = useRef<Totals>({});
  const raw = useRef<StepSample | undefined>(undefined);
  const writes = useRef(Promise.resolve());
  const generation = useRef(0);
  const subscription = useRef<{ remove(): void } | null>(null);
  const dayKeySeen = useRef(dayKey());

  function stop() {
    generation.current += 1;
    subscription.current?.remove();
    subscription.current = null;
    nativeSteps?.stop();
  }
  function persist() {
    const payload = JSON.stringify({ totals: data.current, raw: raw.current });
    writes.current = writes.current.then(() => AsyncStorage.setItem(key, payload)).catch(() => {});
  }
  function record(date: string, value: number) {
    if (!Number.isFinite(value) || value <= (data.current[date] ?? 0)) return;
    const next = { ...data.current, [date]: value };
    const recent = Object.fromEntries(Object.entries(next).sort(([a], [b]) => b.localeCompare(a)).slice(0, 35));
    data.current = recent;
    setTotals(recent);
    persist();
  }
  async function start(request = false) {
    stop();
    const run = generation.current;
    const today = dayKey();
    dayKeySeen.current = today;
    setDay(today);
    try {
      const available = Platform.OS !== 'web' && await Pedometer.isAvailableAsync();
      if (run !== generation.current) return;
      if (!available) { setStatus('unavailable'); return; }
      let permission = await Pedometer.getPermissionsAsync();
      if (request && !permission.granted && permission.canAskAgain) permission = await Pedometer.requestPermissionsAsync();
      if (run !== generation.current) return;
      if (!permission.granted) { setStatus('permission'); return; }
      setStatus('ready');
      if (Platform.OS === 'ios') {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const refresh = async () => {
          const result = await Pedometer.getStepCountAsync(midnight, new Date()).catch(() => null);
          if (result && run === generation.current && today === dayKey()) record(today, result.steps);
        };
        await refresh();
        if (run === generation.current) subscription.current = Pedometer.watchStepCount(() => void refresh());
        return;
      }
      if (!nativeSteps) { setStatus('unavailable'); return; }
      subscription.current = DeviceEventEmitter.addListener('HealthyStepCounter', (sample: {count:number;boot:number;run:number}) => {
        if (run !== generation.current || sample.run !== run || !Number.isSafeInteger(sample.count) || sample.count < 0) return;
        const current = dayKey();
        if (today !== current) { void start(); return; }
        const last = raw.current;
        raw.current = { date:today, count:sample.count, boot:sample.boot };
        const delta = countBetweenSamples(last, raw.current);
        if (delta) {
          record(today, (data.current[today] ?? 0) + delta);
        } else if (!last || last.date !== today || last.count !== sample.count || last.boot !== sample.boot) persist();
      });
      if (!(await nativeSteps.start(run)) && run === generation.current) {
        stop();
        setStatus('unavailable');
      }
    } catch { if (run === generation.current) setStatus('unavailable'); }
  }
  useEffect(() => {
    let alive = true;
    const ready = AsyncStorage.getItem(key).then(stored => {
      if (!alive || !stored) return;
      const parsed = JSON.parse(stored);
      if (!parsed?.totals || typeof parsed.totals !== 'object') return;
      const entries = Object.entries(parsed.totals).filter((entry): entry is [string, number] =>
        /^\d{4}-\d{2}-\d{2}$/.test(entry[0]) && typeof entry[1] === 'number' && Number.isSafeInteger(entry[1]) && entry[1] >= 0);
      data.current = Object.fromEntries(entries);
      const sample = parsed.raw;
      if (sample && typeof sample.date === 'string' && Number.isSafeInteger(sample.count)
        && sample.count >= 0 && Number.isSafeInteger(sample.boot)) raw.current = sample;
      setTotals(data.current);
    }).catch(() => {});
    void ready.then(() => { if (alive && AppState.currentState !== 'background') void start(); });
    const state = AppState.addEventListener('change', value => {
      if (value === 'active') void ready.then(() => { if (alive) void start(); });
      else stop();
    });
    const midnight = setInterval(() => {
      if (dayKey() !== dayKeySeen.current) {
        dayKeySeen.current = dayKey();
        setDay(dayKeySeen.current);
        if (AppState.currentState === 'active') void start();
      }
    }, 1000);
    return () => { alive = false; stop(); state.remove(); clearInterval(midnight); };
  }, []);
  return { steps: totals[day] ?? 0, totals, status, request: () => start(true) };
}
