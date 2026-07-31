// BirdStrike 設定チャンネル (ファームウェア HMLConfigChannel と対応)
//
// Feature report 0x60 (host -> device): コマンド
//   [0]=cmd 0x01 SET_PARAM [1]=target [2]=paramId [3]=index [4..7]=int32 LE
//          0x02 SAVE (flash 保存)
//          0x03 SELECT 次の 0x61 GET の内容を選択
// Feature report 0x61 (device -> host): 応答 63 bytes
// target: 0=左スティック 1=右スティック 2=グローバル
// paramId は proto (HMLStickOptions / HMLAnalogOptions) のフィールド番号

import { useSyncExternalStore } from 'react';

const REPORT_SET = 0x60;
const REPORT_GET = 0x61;
const CMD_SET = 0x01, CMD_SAVE = 0x02, CMD_SELECT = 0x03, CMD_REBOOT = 0x04, CMD_SET_INPUT_MODE = 0x05;
const CMD_CAL_START = 0x06, CMD_CAL_SAVE = 0x07, CMD_CAL_ABORT = 0x08;

// InputMode enum (enums.proto) のうちツールから切り替えを提供するもの
export const INPUT_MODES: [number, string][] = [
	[0, 'XInput (PC)'],
	[4, 'PS4'],
	[13, 'PS5'],
	[16, 'PS5 GNSドングル (P5General・PS5専用/ツール接続不可)'],
	[1, 'Nintendo Switch'],
	[15, 'Switch Pro'],
	[2, 'PS3'],
	[14, 'Generic HID (DInput)'],
	[3, 'キーボード'],
];
const SEL_INFO = 0x00, SEL_RAW = 0x01, SEL_DUMP = 0x03, SEL_HOST = 0x04;

// 基板の種類 (INFO byte 10)。コンバーターはスティックが USB ホストにつないだ
// コントローラーから来るので、専用の画面が要る
export const BOARD_PAD = 0, BOARD_CONVERTER = 1;

// ゲート較正で測る方向の数 (ファーム HML_GATE_BINS と一致させること)
export const GATE_BINS = 16;

// ファーム GamepadUSBHostListener::HostDriver と一致させること
export const DRV = {
	NONE: 0, BUSY: 1, AUTH_DONGLE: 2, DS4: 3, DUALSENSE: 4, SWITCHPRO: 5,
	XBOX360: 6, STADIA: 7, DRIVINGFORCE: 8, ULTRASTIK360: 9, GENERIC: 10,
} as const;

export const SP = {
	calMinX: 1, calCenterX: 2, calMaxX: 3, calMinY: 4, calCenterY: 5, calMaxY: 6,
	innerDeadzone: 7, outerDeadzone: 8, curvePreset: 9, curvePointCount: 10,
	curveX: 11, curveY: 12, rcFilterStrength: 13, rcSnapback: 14, rcAdvanced: 15,
	rcCurvePointCount: 16, rcCurveX: 17, rcCurveY: 18, rcVelocityMult100: 19,
	invertX: 20, invertY: 21, diagScaleX: 22, diagScaleY: 23, noiseSuppress: 24,
	noiseX: 25, noiseY: 26, scaleUp: 27, scaleDown: 28, scaleLeft: 29, scaleRight: 30,
	innerX: 31, innerY: 32, outerX: 33, outerY: 34, antiX: 35, antiY: 36,
	resolution: 37, delayMs: 38, angleOffset100: 39, angleSnap: 40, angleMapCount: 41,
	angleMapIn100: 42, angleMapOut100: 43, angleMapDz100: 44, angleMapEnable: 45,
} as const;

export const GP = {
	enabled: 1, chLX: 2, chLY: 3, chRX: 4, chRY: 5, chPsButton: 6,
	psThreshold: 7, psActiveHigh: 8, l3Threshold: 16, l3ActiveHigh: 17,
	r3Threshold: 19, r3ActiveHigh: 20, lightbarEnabled: 21,
	lightbarBrightness: 23, lightbarColor: 24,
	comboModeB1: 25, comboModeB2: 26, comboModeB3: 27, comboModeB4: 28,
} as const;

export const CURVE_PRESETS: Record<number, { label: string; pts: number[][] }> = {
	0: { label: 'リニア (Linear)', pts: [[30, 30], [70, 70], [100, 100]] },
	1: { label: 'スロースタート (Slow start)', pts: [[60, 30], [90, 80], [100, 100]] },
	2: { label: 'クイックスタート (Quick start)', pts: [[30, 60], [70, 90], [100, 100]] },
	3: { label: 'インスタント (Instant)', pts: [[20, 80], [60, 95], [100, 100]] },
	4: { label: 'スムーズスタート (Smooth start)', pts: [[30, 25], [70, 75], [100, 100]] },
	5: { label: 'カスタム (Custom)', pts: [] },
};

export interface Status {
	text: string;
	kind: '' | 'ok' | 'err';
}

export interface AdsDiag {
	present: boolean;
	linkOk: boolean;
	scanCompleted: boolean;
	probedCs: number;
	probedMode: number;
	hwCs: boolean;
	stitch: boolean;
}

export interface LiveData {
	valid: boolean;
	ch: number[]; // ADS8332 8ch raw
	adc: [number, number];
	out: { lx: number; ly: number; rx: number; ry: number };
	lt: number;
	rt: number;
	diag: AdsDiag;
}

// USB ホストにつないだコントローラーの状態とゲート較正の進み具合
export interface HostData {
	seen: boolean;      // USB スタックから渡されたか
	hid: boolean;       // false = XInput 系 (ベンダークラス) で来た
	vid: number;
	pid: number;
	driver: number;     // HostDriver コード (DRV_*)
	calActive: boolean;
	calStick: number;
	coverage: number;   // 測定済み方向の割合 (%)
	center: [number, number];
	raw: { lx: number; ly: number; rx: number; ry: number }; // 整形前の生値
	radius: number[];   // 方向ごとのゲート半径 (1/1000 フルスケール)
}

export interface StickView {
	rawX: number | null; // 生 ADC 値
	rawY: number | null;
	nx: number | null; // 正規化 -1..1 (キャリブレーション + ハード反転補正)
	ny: number | null;
	ox: number; // 出力 -1..1
	oy: number;
	outX: number; // 出力 raw 0..65535
	outY: number;
}

// 波形ビュー用の時系列サンプル (ポーリングごとに1点)
export interface StickSample {
	nx: number | null;
	ny: number | null;
	ox: number;
	oy: number;
}
export const HISTORY_LEN = 600; // 20Hz × 30秒

type Listener = () => void;

class Birdstrike {
	private device: HIDDevice | null = null;
	private state = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];
	live: LiveData = {
		valid: false, ch: new Array(8).fill(0), adc: [0, 0],
		out: { lx: 32768, ly: 32768, rx: 32768, ry: 32768 }, lt: 0, rt: 0,
		diag: { present: false, linkOk: false, scanCompleted: false, probedCs: -1, probedMode: 255, hwCs: false, stitch: false },
	};
	status: Status = { text: '未接続', kind: '' };
	connected = false;
	deviceName = '';
	inputMode = -1; // INFO 応答の現在モード (-1 = 不明)
	protocolVersion = 0; // ファーム側設定チャンネルのバージョン
	boardKind = BOARD_PAD; // INFO 応答の基板種別
	host: HostData = {
		seen: false, hid: false, vid: 0, pid: 0, driver: 0,
		calActive: false, calStick: 0, coverage: 0, center: [0, 0],
		raw: { lx: 32768, ly: 32768, rx: 32768, ry: 32768 },
		radius: new Array(GATE_BINS).fill(0),
	};
	static readonly REQUIRED_VERSION = 2; // モード切替/再起動に必要
	// 波形ビュー: 直近 HISTORY_LEN サンプルのリングバッファ
	history: [StickSample, StickSample][] = [];
	// flash 保存済みのベースライン (未保存変更の検出用)
	private baseline: Map<string, number>[] = [new Map(), new Map(), new Map()];

	private ioBusy: Promise<unknown> = Promise.resolve();
	private pollTimer: ReturnType<typeof setInterval> | null = null;

	// --- 変更通知 (config / live で購読を分ける) ---
	private cfgVersion = 0;
	private liveVersion = 0;
	private cfgListeners = new Set<Listener>();
	private liveListeners = new Set<Listener>();

	subscribeConfig = (fn: Listener) => { this.cfgListeners.add(fn); return () => this.cfgListeners.delete(fn); };
	subscribeLive = (fn: Listener) => { this.liveListeners.add(fn); return () => this.liveListeners.delete(fn); };
	getConfigVersion = () => this.cfgVersion;
	getLiveVersion = () => this.liveVersion;
	private emitConfig() { this.cfgVersion++; this.cfgListeners.forEach((f) => f()); }
	private emitLive() { this.liveVersion++; this.liveListeners.forEach((f) => f()); }

	private setStatus(text: string, kind: Status['kind'] = '') {
		this.status = { text, kind };
		this.emitConfig();
	}

	// --- HID I/O (直列化) ---
	private enqueue<T>(fn: () => Promise<T>): Promise<T> {
		const p = this.ioBusy.then(fn, fn);
		this.ioBusy = p.catch(() => {});
		return p;
	}

	private async sendReport(bytes: number[] | Uint8Array) {
		if (!this.device) throw new Error('not connected');
		const data = new Uint8Array(63);
		data.set(bytes.length > 63 ? bytes.slice(0, 63) : bytes);
		await this.device.sendFeatureReport(REPORT_SET, data);
	}

	private async receiveReport(): Promise<DataView> {
		if (!this.device) throw new Error('not connected');
		const dv = await this.device.receiveFeatureReport(REPORT_GET);
		// Chrome は先頭に report ID を含む。応答種別が 0x61 になることはないので自動判別
		const off = dv.byteLength > 0 && dv.getUint8(0) === REPORT_GET ? 1 : 0;
		return new DataView(dv.buffer, dv.byteOffset + off, dv.byteLength - off);
	}

	private async select(...args: number[]) {
		await this.sendReport([CMD_SELECT, ...args]);
	}

	// --- 設定値 ---
	getVal(t: number, id: number, idx = 0): number {
		return this.state[t].get(`${id}:${idx}`) ?? 0;
	}

	setParam(t: number, id: number, idx: number, value: number) {
		this.state[t].set(`${id}:${idx}`, value);
		this.emitConfig();
		if (!this.device) return;
		this.enqueue(async () => {
			const b = new Uint8Array(8);
			b[0] = CMD_SET; b[1] = t; b[2] = id; b[3] = idx;
			new DataView(b.buffer).setInt32(4, Math.round(value), true);
			await this.sendReport(b);
		}).catch((e) => this.setStatus(`送信エラー: ${e.message}`, 'err'));
	}

	// --- 未保存変更の管理 ---
	private snapshotBaseline() {
		this.baseline = this.state.map((m) => new Map(m));
	}

	dirtyCount(): number {
		let n = 0;
		for (let t = 0; t < 3; t++) {
			const keys = new Set([...this.state[t].keys(), ...this.baseline[t].keys()]);
			for (const k of keys)
				if ((this.state[t].get(k) ?? 0) !== (this.baseline[t].get(k) ?? 0)) n++;
		}
		return n;
	}

	// 未保存の変更を破棄: ベースライン値を本体に書き戻す
	discard() {
		for (let t = 0; t < 3; t++) {
			const keys = new Set([...this.state[t].keys(), ...this.baseline[t].keys()]);
			for (const k of keys) {
				const oldV = this.baseline[t].get(k) ?? 0;
				if ((this.state[t].get(k) ?? 0) !== oldV) {
					const [id, idx] = k.split(':').map(Number);
					this.setParam(t, id, idx, oldV);
				}
			}
		}
		this.setStatus('未保存の変更を破棄しました', 'ok');
	}

	private async dumpTarget(target: number): Promise<Map<string, number>> {
		const out = new Map<string, number>();
		for (let page = 0; page < 40; page++) {
			await this.select(SEL_DUMP, target, page);
			const dv = await this.receiveReport();
			if (dv.getUint8(0) !== SEL_DUMP) break;
			const count = dv.getUint8(3);
			for (let i = 0; i < count; i++) {
				const o = 4 + i * 6;
				out.set(`${dv.getUint8(o)}:${dv.getUint8(o + 1)}`, dv.getInt32(o + 2, true));
			}
			if (count < 9) break;
		}
		return out;
	}

	// --- ライブデータ ---
	private async pollRaw() {
		if (!this.device) return;
		try {
			await this.enqueue(async () => {
				await this.select(SEL_RAW);
				const dv = await this.receiveReport();
				if (dv.getUint8(0) !== SEL_RAW) return;
				this.live = {
					valid: dv.getUint8(1) !== 0,
					ch: Array.from({ length: 8 }, (_, i) => dv.getUint16(2 + i * 2, true)),
					adc: [dv.getUint16(18, true), dv.getUint16(20, true)],
					out: {
						lx: dv.getUint16(22, true), ly: dv.getUint16(24, true),
						rx: dv.getUint16(26, true), ry: dv.getUint16(28, true),
					},
					lt: dv.getUint8(30), rt: dv.getUint8(31),
					diag: {
						present: dv.getUint8(32) !== 0,
						linkOk: dv.getUint8(33) !== 0,
						scanCompleted: dv.getUint8(34) !== 0,
						probedCs: dv.getInt8(35),
						probedMode: dv.getUint8(36),
						hwCs: dv.getUint8(37) !== 0,
						stitch: dv.getUint8(38) !== 0,
					},
				};
				const v0 = this.stickView(0), v1 = this.stickView(1);
				this.history.push([
					{ nx: v0.nx, ny: v0.ny, ox: v0.ox, oy: v0.oy },
					{ nx: v1.nx, ny: v1.ny, ox: v1.ox, oy: v1.oy },
				]);
				if (this.history.length > HISTORY_LEN) this.history.shift();
			});
			// コンバーターだけ、ホスト側コントローラーと較正の状態も取る
			if (this.isConverter) await this.pollHost();
			this.emitLive();
		} catch {
			/* 一時的な失敗は無視して次のポーリングへ */
		}
	}

	private async pollHost() {
		await this.enqueue(async () => {
			await this.select(SEL_HOST);
			const dv = await this.receiveReport();
			if (dv.getUint8(0) !== SEL_HOST) return;
			this.host = {
				seen: dv.getUint8(1) !== 0,
				hid: dv.getUint8(2) !== 0,
				vid: dv.getUint16(3, true),
				pid: dv.getUint16(5, true),
				driver: dv.getUint8(7),
				calActive: dv.getUint8(8) !== 0,
				calStick: dv.getUint8(9),
				coverage: dv.getUint8(10),
				center: [dv.getUint16(11, true), dv.getUint16(13, true)],
				raw: {
					lx: dv.getUint16(15, true), ly: dv.getUint16(17, true),
					rx: dv.getUint16(19, true), ry: dv.getUint16(21, true),
				},
				radius: Array.from({ length: GATE_BINS }, (_, i) => dv.getUint16(23 + i * 2, true)),
			};
		});
	}

	private calNorm(raw: number, mn: number, ctr: number, mx: number): number {
		if (mx <= mn || ctr <= mn || mx <= ctr) return (raw - 32768) / 32768;
		const v = raw >= ctr ? (raw - ctr) / (mx - ctr) : -(ctr - raw) / (ctr - mn);
		return Math.max(-1, Math.min(1, v));
	}

	stickView(t: 0 | 1): StickView {
		// コンバーターには ADC が無い。生値はホスト側コントローラーの整形前の
		// 値そのもので、中心・範囲はゲートプロファイル側が持つ
		if (this.isConverter) {
			const rx = t === 0 ? this.host.raw.lx : this.host.raw.rx;
			const ry = t === 0 ? this.host.raw.ly : this.host.raw.ry;
			const outX = t === 0 ? this.live.out.lx : this.live.out.rx;
			const outY = t === 0 ? this.live.out.ly : this.live.out.ry;
			return {
				rawX: rx, rawY: ry,
				nx: (rx - 32768) / 32768, ny: (ry - 32768) / 32768,
				ox: (outX - 32768) / 32768, oy: (outY - 32768) / 32768, outX, outY,
			};
		}
		const chX = this.getVal(2, t === 0 ? GP.chLX : GP.chRX);
		const chY = this.getVal(2, t === 0 ? GP.chLY : GP.chRY);
		const rawOf = (c: number) => (this.live.valid && c >= 0 && c < 8 ? this.live.ch[c] : null);
		const rawX = rawOf(chX);
		const rawY = rawOf(chY);
		// ファームは X センサーの物理反転を -calibrate() で補正しているので表示も同じ符号
		const nx = rawX !== null
			? -this.calNorm(rawX, this.getVal(t, SP.calMinX), this.getVal(t, SP.calCenterX), this.getVal(t, SP.calMaxX))
			: null;
		const ny = rawY !== null
			? this.calNorm(rawY, this.getVal(t, SP.calMinY), this.getVal(t, SP.calCenterY), this.getVal(t, SP.calMaxY))
			: null;
		const outX = t === 0 ? this.live.out.lx : this.live.out.rx;
		const outY = t === 0 ? this.live.out.ly : this.live.out.ry;
		return { rawX, rawY, nx, ny, ox: (outX - 32768) / 32768, oy: (outY - 32768) / 32768, outX, outY };
	}

	get isConverter() { return this.boardKind === BOARD_CONVERTER; }

	// --- ゲート較正 ---
	// 手順: calStart → スティックから手を離して中心を取らせる → ゲートに沿って
	// 一周させ coverage が 100 になったら calSave
	async calStart(stick: 0 | 1) {
		await this.enqueue(() => this.sendReport([CMD_CAL_START, stick]))
			.catch((e) => this.setStatus(`較正開始に失敗: ${e.message}`, 'err'));
		this.setStatus('較正中: スティックから手を離してください');
	}

	async calAbort() {
		await this.enqueue(() => this.sendReport([CMD_CAL_ABORT]))
			.catch(() => {});
		this.setStatus('較正を中止しました');
	}

	// 全方向が埋まっていないとファーム側が保存を拒否する
	async calSave(): Promise<boolean> {
		if (this.host.coverage < 100) {
			this.setStatus('まだ測れていない方向があります', 'err');
			return false;
		}
		await this.enqueue(() => this.sendReport([CMD_CAL_SAVE]))
			.catch((e) => this.setStatus(`保存に失敗: ${e.message}`, 'err'));
		this.snapshotBaseline();
		this.setStatus('ゲート較正を保存しました', 'ok');
		return true;
	}

	// --- 接続まわり ---
	async connect() {
		if (!navigator.hid) {
			this.setStatus('WebHID 非対応ブラウザです（Chrome / Edge を使用）', 'err');
			return;
		}
		// どの入力モードでも設定チャンネルは vendor collection (usagePage 0xFF60)
		const devices = await navigator.hid.requestDevice({
			filters: [{ usagePage: 0xff60, usage: 0x01 }],
		});
		if (!devices.length) return;
		this.device = devices.find((d) => d.collections.some((c) => c.usagePage === 0xff60)) ?? devices[0];
		await this.device.open();
		try {
			await this.reload();
		} catch (e) {
			this.setStatus((e as Error).message, 'err');
			await this.device.close();
			this.device = null;
			return;
		}
		this.connected = true;
		this.deviceName = this.device.productName;
		if (this.protocolVersion < Birdstrike.REQUIRED_VERSION) {
			this.setStatus(
				`接続中: ${this.deviceName} — ファームが古いです (ch v${this.protocolVersion}, 要 v${Birdstrike.REQUIRED_VERSION}): モード切替・再起動は動きません`,
				'err');
		} else {
			this.setStatus(`接続中: ${this.deviceName} (ch v${this.protocolVersion})`, 'ok');
		}
		this.pollTimer = setInterval(() => this.pollRaw(), 50);
	}

	async reload() {
		this.setStatus('設定読込中…');
		await this.enqueue(async () => {
			await this.select(SEL_INFO);
			const info = await this.receiveReport();
			const magic = String.fromCharCode(
				info.getUint8(1), info.getUint8(2), info.getUint8(3), info.getUint8(4));
			if (info.getUint8(0) !== SEL_INFO || magic !== 'HMLC')
				throw new Error('このファームウェアは設定チャンネル未対応です');
			this.protocolVersion = info.getUint8(5);
			this.inputMode = info.getUint8(9);
			// v4 より前は基板種別を返さないので、パッドとして扱う
			this.boardKind = this.protocolVersion >= 4 ? info.getUint8(10) : BOARD_PAD;
			for (const t of [0, 1, 2]) this.state[t] = await this.dumpTarget(t);
		});
		this.snapshotBaseline();
		this.emitConfig();
		if (this.connected) this.setStatus(`接続中: ${this.deviceName} (ch v${this.protocolVersion})`, 'ok');
	}

	async disconnect() {
		if (this.pollTimer) clearInterval(this.pollTimer);
		this.pollTimer = null;
		if (this.device) {
			try { await this.device.close(); } catch { /* ignore */ }
		}
		this.device = null;
		this.connected = false;
		this.setStatus('切断しました');
	}

	async save() {
		try {
			await this.enqueue(() => this.sendReport([CMD_SAVE]));
			this.snapshotBaseline();
			this.setStatus('本体の flash に保存しました', 'ok');
		} catch (e) {
			this.setStatus(`保存失敗: ${(e as Error).message}`, 'err');
		}
	}

	// 入力モードを変更して保存・再起動 (InputMode enum 値)
	async setInputMode(mode: number) {
		try {
			await this.enqueue(() => this.sendReport([CMD_SET_INPUT_MODE, mode]));
			this.setStatus('入力モードを保存して再起動中…', 'ok');
		} catch (e) {
			this.setStatus(`モード変更失敗: ${(e as Error).message}`, 'err');
		}
	}

	// mode: 0=通常再起動, 1=BOOTSEL (UF2書き込み), 2=webconfig
	async reboot(mode: 0 | 1 | 2) {
		const label = mode === 1 ? 'BOOTSEL' : mode === 2 ? 'webconfig' : '通常';
		try {
			await this.enqueue(() => this.sendReport([CMD_REBOOT, mode]));
			this.setStatus(`${label} モードで再起動中…`, 'ok');
		} catch (e) {
			this.setStatus(`再起動失敗: ${(e as Error).message}`, 'err');
		}
		// 本体が消えると disconnect イベントで切断処理が走る
	}

	handleUnplug(device: HIDDevice) {
		if (device === this.device) this.disconnect();
	}
}

export const bs = new Birdstrike();

navigator.hid?.addEventListener('disconnect', (e) => {
	bs.handleUnplug((e as HIDConnectionEvent).device);
});

// --- React hooks ---
export function useConfig(): number {
	return useSyncExternalStore(bs.subscribeConfig, bs.getConfigVersion);
}
export function useLive(): number {
	return useSyncExternalStore(bs.subscribeLive, bs.getLiveVersion);
}
