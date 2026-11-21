import { useEffect, useRef, useState } from 'react';
import { bs, useConfig, GP, SP, CURVE_PRESETS, CURVE_PRESETS_V5, CURVE_SLOT_POINTS, OVERSAMPLING } from '../birdstrike';
import { SliderRow, NumberRow, CheckRow, SelectRow, PointsTable } from '../components/Controls';
import { StickCanvas } from '../components/StickCanvas';
import { CurveCanvas } from '../components/CurveCanvas';

const SECTIONS = ['基本設定', '感度カーブ', 'RCフィルタ', '角度補正', 'キャリブレーション'] as const;

function BasicSection({ t }: { t: 0 | 1 }) {
	return (
		<>
			<div className="card">
				<h3>スティックスケール</h3>
				<SliderRow t={t} id={SP.scaleUp} label="↑ 上 (%)" min={50} max={150} />
				<SliderRow t={t} id={SP.scaleDown} label="↓ 下 (%)" min={50} max={150} />
				<SliderRow t={t} id={SP.scaleLeft} label="← 左 (%)" min={50} max={150} />
				<SliderRow t={t} id={SP.scaleRight} label="→ 右 (%)" min={50} max={150} />
				<div className="hr" />
				<SliderRow t={t} id={SP.diagScaleX} label="対角スケール X" min={0} max={100} />
				<SliderRow t={t} id={SP.diagScaleY} label="対角スケール Y" min={0} max={100} />
				<div className="note">対角スケール: 0 = 真円, 100 = 四角（橙の枠 = 出力の到達範囲としてライブに表示）</div>
			</div>
			<div className="card">
				<h3>デッドゾーン（%）</h3>
				<SliderRow t={t} id={SP.innerX} label="内側 X" min={0} max={50} />
				<SliderRow t={t} id={SP.innerY} label="内側 Y" min={0} max={50} />
				<SliderRow t={t} id={SP.outerX} label="外側 X" min={50} max={100} />
				<SliderRow t={t} id={SP.outerY} label="外側 Y" min={50} max={100} />
				<SliderRow t={t} id={SP.antiX} label="アンチ X" min={0} max={50} />
				<SliderRow t={t} id={SP.antiY} label="アンチ Y" min={0} max={50} />
			</div>
		</>
	);
}

function CurveSection({ t }: { t: 0 | 1 }) {
	useConfig();
	const preset = bs.getVal(t, SP.curvePreset);
	const isCustom = preset >= 5;
	if (bs.hasV5) {
		// ch v5: カスタム 4 枠、0.1% 単位 (FireBird A* と同じ)
		const slot = Math.min(Math.max(preset - 5, 0), 3);
		return (
			<div className="card">
				<SelectRow t={t} id={SP.curvePreset} label="プリセット" options={CURVE_PRESETS_V5} />
				<CurveCanvas stick={t} />
				{isCustom && (
					<PointsTable t={t} idX={SP.curvesX} idY={SP.curvesY} idCount={SP.curvesCount}
						base={slot * CURVE_SLOT_POINTS} countIdx={slot} scale={10} step={0.1}
						maxPts={CURVE_SLOT_POINTS} countLabel="ポイント数" xLabel="入力 %" yLabel="出力 %" />
				)}
				<div className="note">座標は 0.0〜100.0% を 0.1% 単位で指定できます。</div>
			</div>
		);
	}
	return (
		<div className="card">
			<SelectRow t={t} id={SP.curvePreset} label="プリセット"
				options={Object.entries(CURVE_PRESETS).map(([v, p]) => [+v, p.label])} />
			<CurveCanvas stick={t} />
			{isCustom && (
				<PointsTable t={t} idX={SP.curveX} idY={SP.curveY} idCount={SP.curvePointCount}
					maxPts={10} countLabel="ポイント数" xLabel="入力 %" yLabel="出力 %" />
			)}
		</div>
	);
}

function RcSection({ t }: { t: 0 | 1 }) {
	useConfig();
	const advanced = !!bs.getVal(t, SP.rcAdvanced);
	return (
		<>
			<div className="card">
				<h3>ジャンプ防止・スナップバック抑制</h3>
				<SliderRow t={t} id={SP.rcFilterStrength} label="フィルタ強度" min={-500} max={500} />
				<SliderRow t={t} id={SP.rcSnapback} label="スナップバック抑制" min={0} max={100} />
				<SliderRow t={t} id={SP.rcVelocityMult100} label="速度係数" min={0} max={10} scale={100} step={0.05} />
				<CheckRow t={t} id={SP.rcAdvanced} label="詳細モード（速度カーブ）" />
				{advanced && (
					<PointsTable t={t} idX={SP.rcCurveX} idY={SP.rcCurveY} idCount={SP.rcCurvePointCount}
						maxPts={7} countLabel="ポイント数" xLabel="速度 0-128" yLabel="強度 -500..500" />
				)}
			</div>
			<div className="card">
				<h3>動作の安定化（静止時ジッター抑制）</h3>
				<CheckRow t={t} id={SP.noiseSuppress} label="有効" />
				<NumberRow t={t} id={SP.noiseX} label="ノイズ幅 X (raw)" min={0} max={3276} />
				<NumberRow t={t} id={SP.noiseY} label="ノイズ幅 Y (raw)" min={0} max={3276} />
				<NoiseMeasureButton t={t} />
				<div className="note">
					ノイズ幅以内の変動を静止とみなして出力をホールドします。値が大きすぎると
					スティックが動かなくなるので、計測ボタンで実測するのが確実です（上限5%）。
				</div>
			</div>
			<div className="card">
				<h3>出力・遅延</h3>
				{bs.hasV5 && (
					<>
						<SelectRow t={t} id={SP.oversampling} label="オーバーサンプリング" options={OVERSAMPLING} />
						<div className="note">ADC の読み取り値を移動平均して静止時のブレを減らします。平均する回数を増やすほど、わずかに遅延が増えます（16 回で約 1.3ms）。</div>
					</>
				)}
				<SliderRow t={t} id={SP.resolution} label="出力分解能 (0=無制限)" min={0} max={128} />
				<SliderRow t={t} id={SP.delayMs} label="入力遅延 ms" min={0} max={40} />
				<CheckRow t={t} id={SP.invertX} label="X軸 反転" />
				<CheckRow t={t} id={SP.invertY} label="Y軸 反転" />
			</div>
		</>
	);
}

// 2秒間 raw をサンプリングして peak-to-peak x1.2 をノイズ幅として書き込む
function NoiseMeasureButton({ t }: { t: 0 | 1 }) {
	const [busy, setBusy] = useState(false);
	const run = async () => {
		setBusy(true);
		try {
			const chX = bs.getVal(2, t === 0 ? GP.chLX : GP.chRX);
			const chY = bs.getVal(2, t === 0 ? GP.chLY : GP.chRY);
			if (chX < 0 || chX > 7 || chY < 0 || chY > 7) return;
			let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
			for (let i = 0; i < 40; i++) {
				await new Promise((r) => setTimeout(r, 50));
				if (!bs.live.valid) continue;
				const x = bs.live.ch[chX], y = bs.live.ch[chY];
				mnX = Math.min(mnX, x); mxX = Math.max(mxX, x);
				mnY = Math.min(mnY, y); mxY = Math.max(mxY, y);
			}
			if (Number.isFinite(mnX) && Number.isFinite(mnY)) {
				bs.setParam(t, SP.noiseX, 0, Math.min(3276, Math.ceil((mxX - mnX) * 1.2)));
				bs.setParam(t, SP.noiseY, 0, Math.min(3276, Math.ceil((mxY - mnY) * 1.2)));
			}
		} finally {
			setBusy(false);
		}
	};
	return (
		<div className="row">
			<label></label>
			<button disabled={busy} onClick={run}>
				{busy ? '計測中… スティックに触れないでください' : 'ノイズ幅を計測 (2秒)'}
			</button>
		</div>
	);
}

function AngleMapTable({ t }: { t: 0 | 1 }) {
	useConfig();
	const count = bs.getVal(t, SP.angleMapCount);
	const mask = bs.getVal(t, SP.angleMapEnable);
	return (
		<div>
			<div className="row">
				<label>マップ数</label>
				<input type="range" min={0} max={16} step={1} value={count}
					onChange={(e) => bs.setParam(t, SP.angleMapCount, 0, +e.target.value)} />
				<span>{count}</span>
			</div>
			<table className="pts">
				<thead>
					<tr><th>有効</th><th>入力角</th><th>出力角</th><th>吸着幅</th></tr>
				</thead>
				<tbody>
					{Array.from({ length: count }, (_, i) => (
						<tr key={i}>
							<td><input type="checkbox" checked={!!(mask & (1 << i))}
								onChange={(e) => bs.setParam(t, SP.angleMapEnable, 0,
									e.target.checked ? (mask | (1 << i)) : (mask & ~(1 << i)))} /></td>
							<td><input type="number" step={0.5} value={bs.getVal(t, SP.angleMapIn100, i) / 100}
								onChange={(e) => bs.setParam(t, SP.angleMapIn100, i, Math.round((+e.target.value || 0) * 100))} /></td>
							<td><input type="number" step={0.5} value={bs.getVal(t, SP.angleMapOut100, i) / 100}
								onChange={(e) => bs.setParam(t, SP.angleMapOut100, i, Math.round((+e.target.value || 0) * 100))} /></td>
							<td><input type="number" step={0.5} min={0} value={bs.getVal(t, SP.angleMapDz100, i) / 100}
								onChange={(e) => bs.setParam(t, SP.angleMapDz100, i, Math.round((+e.target.value || 0) * 100))} /></td>
						</tr>
					))}
				</tbody>
			</table>
			<div className="note">角度は度単位。吸着幅内の入力角が出力角に吸着します。</div>
		</div>
	);
}

function AngleSection({ t }: { t: 0 | 1 }) {
	useConfig();
	return (
		<>
			{bs.hasV5 && <AngleCalWizard t={t} />}
			<div className="card">
				<SliderRow t={t} id={SP.angleOffset100} label="全体回転 (度)" min={-180} max={180} scale={100} step={0.5} />
				<SelectRow t={t} id={SP.angleSnap} label="角度スナップ"
					options={[[0, 'オフ'], [1, '45度'], [2, '90度']]} />
				<div className="hr" />
				<AngleMapTable t={t} />
			</div>
		</>
	);
}

// 8 方向の角度キャリブレーション (ch v5):
//   各方向に倒し切って静止 -> 角度補正直前のベクトルから角度を測る
//   -> 測った角度を 45 度の倍数へ写す角度マップ (8 点) を書き込む
// 目標角は測定角を 45 度単位に丸めて決めるので、ファーム側の角度の取り方
// (0 度がどちらか) に依存しない。
const CAL_DIRS = ['上', '右上', '右', '右下', '下', '左下', '左', '左上'];
const ANGLE_CAL_MIN_MAG = 0.8;   // 倒し切りとみなす大きさ
const ANGLE_CAL_STABLE = 10;     // 連続サンプル数 (50ms 間隔 = 0.5 秒)
const ANGLE_CAL_SPREAD = 5.0;    // その間の角度のばらつき上限 (度)。指の揺れを許す
const ANGLE_CAL_MIN_SEP = 20;    // 記録済みの方向からこれ以上離れていること (度)
const ANGLE_CAL_MANUAL_MIN = 3;  // 手動記録に必要なサンプル数

const angleOf = (x: number, y: number) => {
	// ファームと同じ: atan2(x, y)、0..360
	const a = Math.atan2(x, y) * 180 / Math.PI;
	return a < 0 ? a + 360 : a;
};
const angDiff = (a: number, b: number) => {
	let d = a - b;
	while (d > 180) d -= 360;
	while (d < -180) d += 360;
	return d;
};
const circMean = (w: number[]) => {
	const sx = w.reduce((s, a) => s + Math.sin(a * Math.PI / 180), 0);
	const cx = w.reduce((s, a) => s + Math.cos(a * Math.PI / 180), 0);
	const m = Math.atan2(sx, cx) * 180 / Math.PI;
	return m < 0 ? m + 360 : m;
};
// 円周平均からの最大のずれ
const circSpread = (w: number[]) => {
	if (!w.length) return 0;
	const m = circMean(w);
	return Math.max(...w.map((a) => Math.abs(angDiff(a, m))));
};

interface CalLive { mag: number; ang: number; spread: number; held: number; msg: string; ok: boolean }

function AngleCalWizard({ t }: { t: 0 | 1 }) {
	const [step, setStep] = useState(-1); // -1 = 待機, 0..7 = 計測中の方向, 8 = 確認
	const [now, setNow] = useState<CalLive>({ mag: 0, ang: 0, spread: 0, held: 0, msg: '', ok: false });
	const [measured, setMeasured] = useState<number[]>([]);
	const timer = useRef<ReturnType<typeof setInterval> | 0>(0);
	const samples = useRef<number[]>([]);
	const accRef = useRef<number[]>([]);
	const stepRef = useRef(-1);
	const busy = useRef(false);

	const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = 0; };
	useEffect(() => () => stop(), []);

	const record = (dir: number, ang: number) => {
		const next = [...accRef.current, ang];
		accRef.current = next;
		setMeasured(next);
		if (dir + 1 < CAL_DIRS.length) run(dir + 1, next);
		else { stop(); stepRef.current = 8; setStep(8); }
	};

	const run = (dir: number, acc: number[]) => {
		stop();
		accRef.current = acc;
		stepRef.current = dir;
		setStep(dir);
		samples.current = [];
		timer.current = setInterval(async () => {
			if (busy.current) return;
			busy.current = true;
			try {
				const v = await bs.readStickVec();
				if (!v || !v.valid || stepRef.current !== dir) return;
				const x = v.x[t], y = v.y[t];
				const mag = Math.hypot(x, y), ang = angleOf(x, y);
				const w = samples.current;
				const live = (spread: number, msg: string, ok = false) =>
					setNow({ mag, ang, spread, held: w.length, msg, ok });
				if (mag < ANGLE_CAL_MIN_MAG) { w.length = 0; live(0, 'もっと倒してください'); return; }
				const near = accRef.current.find((a) => Math.abs(angDiff(ang, a)) < ANGLE_CAL_MIN_SEP);
				if (near !== undefined) { w.length = 0; live(0, '記録済みの方向と同じです。次の方向へ倒してください'); return; }
				w.push(ang);
				if (w.length > ANGLE_CAL_STABLE) w.shift();
				const spread = circSpread(w);
				if (spread > ANGLE_CAL_SPREAD) {
					// 揺れたら古いサンプルを捨てて数え直す
					while (w.length > 1 && circSpread(w) > ANGLE_CAL_SPREAD) w.shift();
					live(spread, 'ぶれています。そのまま止めてください');
					return;
				}
				if (w.length < ANGLE_CAL_STABLE) { live(spread, '止めたまま待ってください', true); return; }
				record(dir, circMean(w));
			} finally {
				busy.current = false;
			}
		}, 50);
	};

	const recordNow = () => {
		const w = samples.current;
		if (step < 0 || step >= 8 || w.length < ANGLE_CAL_MANUAL_MIN) return;
		record(step, circMean(w));
	};

	const targets = measured.map((a) => ((Math.round(a / 45) * 45) % 360 + 360) % 360);
	const distinct = new Set(targets).size === CAL_DIRS.length;
	const maxErr = measured.length ? Math.max(...measured.map((a, i) => Math.abs(angDiff(a, targets[i])))) : 0;

	const write = () => {
		const pairs = measured.map((a, i) => [a, targets[i]]).sort((p, q) => p[0] - q[0]);
		pairs.forEach(([a, tg], i) => {
			bs.setParam(t, SP.angleMapIn100, i, Math.round(a * 100));
			bs.setParam(t, SP.angleMapOut100, i, Math.round(tg * 100));
			bs.setParam(t, SP.angleMapDz100, i, 0);
		});
		bs.setParam(t, SP.angleMapCount, 0, pairs.length);
		bs.setParam(t, SP.angleMapEnable, 0, (1 << pairs.length) - 1);
		stepRef.current = -1;
		setStep(-1);
		setMeasured([]);
	};
	const cancel = () => { stop(); stepRef.current = -1; setStep(-1); setMeasured([]); };
	const restart = () => { setMeasured([]); run(0, []); };

	return (
		<div className="card">
			<h3>8 方向の角度キャリブレーション</h3>
			{step === -1 && (
				<>
					<div className="note">
						スティックを 8 方向それぞれに倒し切って、各方向で 0.5 秒ほど止めます。測った角度が
						正確な 45 度刻みになるよう、角度マップ（8 点）を書き込みます。今の角度マップは上書きされます。
					</div>
					<div className="row"><label></label><button onClick={() => run(0, [])}>開始</button></div>
				</>
			)}
			{step >= 0 && step < 8 && (
				<>
					<div className="note">
						<b>{CAL_DIRS[step]}</b> に倒し切って止めてください（{step + 1} / 8）。止まると自動で次へ進みます。
						自動で進まないときは、倒したまま「今の角度で記録」を押してください。
					</div>
					<div className="vals">
						{'大きさ ' + (now.mag * 100).toFixed(0) + '%  角度 ' + now.ang.toFixed(1) + '°  ぶれ ' +
							now.spread.toFixed(1) + '°  ' + Math.min(now.held, ANGLE_CAL_STABLE) + '/' + ANGLE_CAL_STABLE}
					</div>
					<div className="note" style={{ color: now.ok ? 'var(--ok)' : 'var(--err)' }}>{now.msg}</div>
					<div className="row">
						<button className="primary" onClick={recordNow} disabled={now.held < ANGLE_CAL_MANUAL_MIN}>今の角度で記録</button>
						<button onClick={cancel}>キャンセル</button>
					</div>
				</>
			)}
			{step === 8 && (
				<>
					<table className="pts">
						<thead><tr><th>方向</th><th>測定角</th><th>目標角</th><th>ずれ</th></tr></thead>
						<tbody>
							{measured.map((a, i) => (
								<tr key={i}><td>{CAL_DIRS[i]}</td><td>{a.toFixed(2)}°</td><td>{targets[i]}°</td>
									<td>{angDiff(a, targets[i]).toFixed(2)}°</td></tr>
							))}
						</tbody>
					</table>
					{!distinct ? (
						<div className="note" style={{ color: 'var(--err)' }}>
							8 方向が区別できませんでした（同じ方向が 2 回測られています）。やり直してください。
						</div>
					) : (
						<div className="note">最大のずれ {maxErr.toFixed(2)}°。書き込んだ後、ライブビューで確認して「本体に保存」してください。</div>
					)}
					<div className="row">
						<button className="primary" onClick={write} disabled={!distinct}>書き込み</button>
						<button onClick={restart}>やり直す</button>
						<button onClick={cancel}>キャンセル</button>
					</div>
				</>
			)}
		</div>
	);
}


// ガイド付き自動キャリブレーション:
//   1) 中央で2秒静止 -> center を平均から取得
//   2) ぐるぐる回して端まで倒す -> min/max を追跡（スパイクフィルタ付き）
//   3) 測定値と妥当性チェックを確認してから書き込み
const CAL_MIN_SPAN = 6000;   // 中央から各端まで最低限必要な振れ幅 (raw, ~9%FS)
const CAL_SPIKE_JUMP = 20000; // 前サンプルからこれ以上飛んだ値はグリッチとして無視

function CalibrationWizard({ t }: { t: 0 | 1 }) {
	useConfig();
	const [phase, setPhase] = useState<'idle' | 'center' | 'range' | 'confirm'>('idle');
	const [progress, setProgress] = useState('');
	const meas = useRef({
		ctrX: 0, ctrY: 0, mnX: 0, mxX: 0, mnY: 0, mxY: 0,
		prevX: -1, prevY: -1,
		timer: 0 as ReturnType<typeof setInterval> | 0,
	});

	const channels = () => {
		const chX = bs.getVal(2, t === 0 ? GP.chLX : GP.chRX);
		const chY = bs.getVal(2, t === 0 ? GP.chLY : GP.chRY);
		return chX >= 0 && chX < 8 && chY >= 0 && chY < 8 ? { chX, chY } : null;
	};

	const stop = () => {
		if (meas.current.timer) clearInterval(meas.current.timer);
		meas.current.timer = 0;
	};

	const startCenter = () => {
		const ch = channels();
		if (!ch) return;
		setPhase('center');
		let sumX = 0, sumY = 0, n = 0;
		stop();
		meas.current.timer = setInterval(() => {
			if (bs.live.valid) {
				sumX += bs.live.ch[ch.chX];
				sumY += bs.live.ch[ch.chY];
				n++;
			}
			setProgress(`中央を計測中… ${Math.min(100, Math.round(n / 40 * 100))}%`);
			if (n >= 40) { // 2秒
				stop();
				meas.current.ctrX = Math.round(sumX / n);
				meas.current.ctrY = Math.round(sumY / n);
				startRange(ch.chX, ch.chY);
			}
		}, 50);
	};

	const startRange = (chX: number, chY: number) => {
		setPhase('range');
		const m = meas.current;
		m.mnX = m.mxX = m.ctrX;
		m.mnY = m.mxY = m.ctrY;
		m.prevX = m.prevY = -1;
		m.timer = setInterval(() => {
			if (bs.live.valid) {
				const x = bs.live.ch[chX], y = bs.live.ch[chY];
				// ADCグリッチ対策: 前サンプルから急激に飛んだ値は捨てる
				// (ゆっくり回す前提。連続した実移動なら次サンプルで追いつく)
				if (m.prevX < 0 || Math.abs(x - m.prevX) <= CAL_SPIKE_JUMP) {
					m.mnX = Math.min(m.mnX, x); m.mxX = Math.max(m.mxX, x);
				}
				if (m.prevY < 0 || Math.abs(y - m.prevY) <= CAL_SPIKE_JUMP) {
					m.mnY = Math.min(m.mnY, y); m.mxY = Math.max(m.mxY, y);
				}
				m.prevX = x; m.prevY = y;
			}
			setProgress(`X: ${m.mnX} .. ${m.ctrX} .. ${m.mxX}\nY: ${m.mnY} .. ${m.ctrY} .. ${m.mxY}`);
		}, 50);
	};

	// 中央から各端までの振れ幅が十分あるか
	const validation = () => {
		const m = meas.current;
		const spans: [string, number][] = [
			['X-側', m.ctrX - m.mnX], ['X+側', m.mxX - m.ctrX],
			['Y-側', m.ctrY - m.mnY], ['Y+側', m.mxY - m.ctrY],
		];
		return spans.filter(([, span]) => span < CAL_MIN_SPAN);
	};

	const toConfirm = () => {
		stop();
		setPhase('confirm');
		const m = meas.current;
		setProgress(`X: ${m.mnX} .. ${m.ctrX} .. ${m.mxX}\nY: ${m.mnY} .. ${m.ctrY} .. ${m.mxY}`);
	};

	const write = () => {
		const m = meas.current;
		bs.setParam(t, SP.calMinX, 0, m.mnX);
		bs.setParam(t, SP.calCenterX, 0, m.ctrX);
		bs.setParam(t, SP.calMaxX, 0, m.mxX);
		bs.setParam(t, SP.calMinY, 0, m.mnY);
		bs.setParam(t, SP.calCenterY, 0, m.ctrY);
		bs.setParam(t, SP.calMaxY, 0, m.mxY);
		setPhase('idle');
		setProgress('書き込み完了。ライブビューで確認して「本体に保存」してください。');
	};

	const cancel = () => { stop(); setPhase('idle'); setProgress(''); };

	useEffect(() => () => stop(), []);

	const bad = phase === 'confirm' ? validation() : [];

	return (
		<div className="card">
			<h3>自動キャリブレーション</h3>
			{phase === 'idle' && (
				<div className="row">
					<label>スティックに触れず開始</label>
					<button onClick={startCenter} disabled={!channels()}>開始</button>
				</div>
			)}
			{phase === 'center' && <div className="note">スティックに触れないでください。</div>}
			{phase === 'range' && (
				<>
					<div className="note">スティックをゆっくり数回、外周に沿って回してください（全方向で端まで倒す）。</div>
					<div className="row">
						<button className="primary" onClick={toConfirm}>計測終了</button>
						<button onClick={cancel}>キャンセル</button>
					</div>
				</>
			)}
			{phase === 'confirm' && (
				<>
					{bad.length > 0 ? (
						<div className="note" style={{ color: 'var(--err)' }}>
							計測範囲が狭すぎます: {bad.map(([name]) => name).join(', ')}
							（中央から{CAL_MIN_SPAN}カウント未満）。スティックが端まで倒れていないか、
							計測中にデータが乱れています。書き込まずにやり直してください。
						</div>
					) : (
						<div className="note">この値を書き込みます。よければ「書き込み」を押してください。</div>
					)}
					<div className="row">
						<button className="primary" onClick={write} disabled={bad.length > 0}>書き込み</button>
						<button onClick={startCenter}>やり直す</button>
						<button onClick={cancel}>キャンセル</button>
					</div>
				</>
			)}
			{progress && <div className="vals">{progress}</div>}
		</div>
	);
}

function CalibrationSection({ t }: { t: 0 | 1 }) {
	return (
		<div>
		<CalibrationWizard t={t} />
		<div className="card">
			<h3>raw 16bit 値</h3>
			<NumberRow t={t} id={SP.calMinX} label="X 最小" min={0} max={65535} />
			<NumberRow t={t} id={SP.calCenterX} label="X 中央" min={0} max={65535} />
			<NumberRow t={t} id={SP.calMaxX} label="X 最大" min={0} max={65535} />
			<NumberRow t={t} id={SP.calMinY} label="Y 最小" min={0} max={65535} />
			<NumberRow t={t} id={SP.calCenterY} label="Y 中央" min={0} max={65535} />
			<NumberRow t={t} id={SP.calMaxY} label="Y 最大" min={0} max={65535} />
			<div className="note">
				手動調整も可能: ライブビューの raw 値を見ながら、中央と四方に倒し切った値を入力してください。
			</div>
		</div>
		</div>
	);
}

export function StickPage({ stick }: { stick: 0 | 1 }) {
	const [section, setSection] = useState(0);
	return (
		<div className="stickWrap">
			<div className="stickContent">
				<nav className="htabs">
					{SECTIONS.map((label, i) => (
						<button key={label} className={i === section ? 'active' : ''}
							onClick={() => setSection(i)}>{label}</button>
					))}
				</nav>
				{section === 0 && <BasicSection t={stick} />}
				{section === 1 && <CurveSection t={stick} />}
				{section === 2 && <RcSection t={stick} />}
				{section === 3 && <AngleSection t={stick} />}
				{section === 4 && <CalibrationSection t={stick} />}
			</div>
			<aside className="stickSide">
				<div className="card">
					<h3>ライブ</h3>
					<StickCanvas stick={stick} size={180} />
				</div>
			</aside>
		</div>
	);
}
