// 波形ビュー: スティック生値(灰)と出力(青)の時系列表示 (RCフィルタ調整用)
import { useEffect, useRef, useState } from 'react';
import { bs, useLive, HISTORY_LEN } from '../birdstrike';

function AxisChart({ stick, axis }: { stick: 0 | 1; axis: 'x' | 'y' }) {
	useLive();
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const cv = ref.current;
		if (!cv) return;
		const ctx = cv.getContext('2d')!;
		const W = cv.width, H = cv.height, cy = H / 2;
		ctx.clearRect(0, 0, W, H);

		// 基準線: 中央(0) と ±1
		ctx.strokeStyle = '#333945';
		ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
		ctx.strokeStyle = 'rgba(51,57,69,0.5)';
		ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(W, 4); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(0, H - 4); ctx.lineTo(W, H - 4); ctx.stroke();
		ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

		const hist = bs.history;
		const step = W / HISTORY_LEN;
		const yOf = (v: number) => cy + v * (H / 2 - 4);

		const plot = (pick: (s: { nx: number | null; ny: number | null; ox: number; oy: number }) => number | null,
			color: string, width: number) => {
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			ctx.beginPath();
			let started = false;
			for (let i = 0; i < hist.length; i++) {
				const v = pick(hist[i][stick]);
				if (v === null) { started = false; continue; }
				const x = W - (hist.length - i) * step;
				if (!started) { ctx.moveTo(x, yOf(v)); started = true; }
				else ctx.lineTo(x, yOf(v));
			}
			ctx.stroke();
			ctx.lineWidth = 1;
		};

		plot((s) => (axis === 'x' ? s.nx : s.ny), '#98a1ad', 1);
		plot((s) => (axis === 'x' ? s.ox : s.oy), '#4da3ff', 1.5);
	});

	return (
		<div className="card">
			<h3>{axis.toUpperCase()} 軸</h3>
			<canvas ref={ref} width={760} height={150} style={{ maxWidth: '100%' }} />
		</div>
	);
}

export function ScopePage() {
	const [stick, setStick] = useState<0 | 1>(0);
	return (
		<div>
			<nav className="htabs">
				<button className={stick === 0 ? 'active' : ''} onClick={() => setStick(0)}>左スティック</button>
				<button className={stick === 1 ? 'active' : ''} onClick={() => setStick(1)}>右スティック</button>
			</nav>
			<AxisChart stick={stick} axis="x" />
			<AxisChart stick={stick} axis="y" />
			<div className="note">
				灰 = 生値（キャリブレーション適用後） / 青 = 実際の出力。直近30秒。
				スナップバックの跳ね返りやRCフィルタの遅れ・ジッターの効き具合がここで確認できます。
			</div>
		</div>
	);
}
